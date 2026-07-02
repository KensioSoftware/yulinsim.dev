#!/usr/bin/env -S pnpm tsx

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type MarkdownParts = {
  frontmatter: string | undefined;
  body: string;
};

type FrontmatterFields = {
  title?: string;
  description?: string;
};

type ServiceDoc = {
  slug: string;
  title: string;
  description: string;
};

type CopyResult = {
  created: number;
  updated: number;
  skipped: number;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));

const rootDir = resolve(scriptDir, "..");
const yulinRepo = process.env.YULIN_REPO ?? resolve(rootDir, "../yulin");

const sourceDocsRoot = join(yulinRepo, "docs");
const targetDocsRoot = join(rootDir, "src/content/docs");
const docsIndex = join(targetDocsRoot, "index.mdx");
const astroConfig = join(rootDir, "astro.config.mjs");

const serviceDocsStart = "{/* service-docs:start */}";
const serviceDocsEnd = "{/* service-docs:end */}";
const serviceSidebarStart = "// service-sidebar:start";
const serviceSidebarEnd = "// service-sidebar:end";

async function main(): Promise<void> {
  assertDirectoryExists(
    sourceDocsRoot,
    `Could not find Yulin docs at: ${sourceDocsRoot}
Set YULIN_REPO=/absolute/path/to/yulin if needed.`,
  );

  assertDirectoryExists(
    targetDocsRoot,
    `Could not find website docs root at: ${targetDocsRoot}`,
  );

  assertFileExists(docsIndex, `Could not find docs index at: ${docsIndex}`);
  assertFileExists(
    astroConfig,
    `Could not find Astro config at: ${astroConfig}`,
  );

  const result: CopyResult = {
    created: 0,
    updated: 0,
    skipped: 0,
  };

  const serviceDocs = await copyReadmesUnderDirectory({
    sourceRoot: join(sourceDocsRoot, "services"),
    targetRoot: join(targetDocsRoot, "services"),
    titlePrefix: "Simulated",
    result,
  });

  await replaceMarkedBlockInFile(
    docsIndex,
    serviceDocsStart,
    serviceDocsEnd,
    generateServiceDocsCards(serviceDocs),
  );

  await replaceMarkedBlockInFile(
    astroConfig,
    serviceSidebarStart,
    serviceSidebarEnd,
    generateServiceSidebarItems(serviceDocs),
  );

  console.log();
  console.log("Done.");
  console.log(`Created docs files: ${result.created}`);
  console.log(`Updated docs files: ${result.updated}`);
  console.log(`Skipped missing source docs: ${result.skipped}`);
  console.log(`Updated docs index: ${docsIndex}`);
  console.log(`Updated Astro sidebar: ${astroConfig}`);
}

async function copyReadmesUnderDirectory({
  sourceRoot,
  targetRoot,
  titlePrefix,
  result,
}: {
  sourceRoot: string;
  targetRoot: string;
  titlePrefix: string;
  result: CopyResult;
}): Promise<ServiceDoc[]> {
  if (!existsSync(sourceRoot)) {
    console.warn(`Skipping missing docs directory: ${sourceRoot}`);
    result.skipped += 1;
    return [];
  }

  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const serviceDocs: ServiceDoc[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sourceFile = join(sourceRoot, entry.name, "README.md");
    const targetFile = join(targetRoot, entry.name, "index.md");

    const serviceDoc = await copyDocFile({
      sourceFile,
      targetFile,
      fallbackTitle: `${titlePrefix} ${toTitleCase(entry.name)}`,
      slug: entry.name,
      result,
    });

    if (serviceDoc !== undefined) {
      serviceDocs.push(serviceDoc);
    }
  }

  return serviceDocs.sort((a, b) => a.title.localeCompare(b.title));
}

async function copyDocFile({
  sourceFile,
  targetFile,
  fallbackTitle,
  slug,
  result,
}: {
  sourceFile: string;
  targetFile: string;
  fallbackTitle: string;
  slug: string;
  result: CopyResult;
}): Promise<ServiceDoc | undefined> {
  if (!existsSync(sourceFile)) {
    console.warn(`Skipping missing source doc: ${sourceFile}`);
    result.skipped += 1;
    return undefined;
  }

  const sourceText = await readFile(sourceFile, "utf8");
  const sourceParts = parseMarkdown(sourceText);
  const sourceBodyWithTitle = sourceParts.body.trim();
  const sourceBody = stripFirstH1(sourceBodyWithTitle).trim();
  const sourceTitle = extractTitle(sourceBodyWithTitle);
  const sourceFrontmatter = parseFrontmatterFields(sourceParts.frontmatter);

  let targetFrontmatter: string;
  let targetFrontmatterFields: FrontmatterFields;
  let created = false;

  if (existsSync(targetFile)) {
    const targetText = await readFile(targetFile, "utf8");
    const targetParts = parseMarkdown(targetText);
    targetFrontmatter =
      targetParts.frontmatter ?? makeFrontmatter(sourceTitle ?? fallbackTitle);
    targetFrontmatterFields = parseFrontmatterFields(targetFrontmatter);
  } else {
    targetFrontmatter = makeFrontmatter(
      sourceFrontmatter.title ?? sourceTitle ?? fallbackTitle,
    );
    targetFrontmatterFields = parseFrontmatterFields(targetFrontmatter);
    created = true;
  }

  await mkdir(dirname(targetFile), { recursive: true });

  const updatedText = `${targetFrontmatter}\n\n${sourceBody}\n`;
  await writeFile(targetFile, updatedText);

  if (created) {
    console.log(`Created docs file: ${targetFile}`);
    result.created += 1;
  } else {
    console.log(`Updated docs file: ${targetFile}`);
    result.updated += 1;
  }

  return {
    slug,
    title: stripSimulatedPrefix(
      targetFrontmatterFields.title ??
        sourceFrontmatter.title ??
        sourceTitle ??
        fallbackTitle,
    ),
    description:
      targetFrontmatterFields.description ??
      sourceFrontmatter.description ??
      "",
  };
}

function parseMarkdown(text: string): MarkdownParts {
  if (!text.startsWith("---\n")) {
    return {
      frontmatter: undefined,
      body: text,
    };
  }

  const endIndex = text.indexOf("\n---", 4);

  if (endIndex === -1) {
    return {
      frontmatter: undefined,
      body: text,
    };
  }

  const frontmatterEndIndex = endIndex + "\n---".length;
  const bodyStartIndex =
    text[frontmatterEndIndex] === "\r" && text[frontmatterEndIndex + 1] === "\n"
      ? frontmatterEndIndex + 2
      : text[frontmatterEndIndex] === "\n"
        ? frontmatterEndIndex + 1
        : frontmatterEndIndex;

  return {
    frontmatter: text.slice(0, frontmatterEndIndex),
    body: text.slice(bodyStartIndex),
  };
}

function parseFrontmatterFields(
  frontmatter: string | undefined,
): FrontmatterFields {
  if (frontmatter === undefined) {
    return {};
  }

  return {
    title: parseFrontmatterStringField(frontmatter, "title"),
    description: parseFrontmatterStringField(frontmatter, "description"),
  };
}

function parseFrontmatterStringField(
  frontmatter: string,
  fieldName: string,
): string | undefined {
  const match = frontmatter.match(
    new RegExp(`^${escapeRegExp(fieldName)}:\\s*(.*)$`, "m"),
  );

  if (match === null) {
    return undefined;
  }

  const value = match[1].trim();

  if (value.length === 0) {
    return "";
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function makeFrontmatter(title: string): string {
  return `---
title: ${JSON.stringify(title)}
description: ""
---`;
}

function extractTitle(markdownBody: string): string | undefined {
  const headingMatch = markdownBody.match(/^#\s+(.+)$/m);

  return headingMatch?.[1]?.trim();
}

function stripFirstH1(markdownBody: string): string {
  return markdownBody.replace(/^#\s+.+(?:\r?\n)+/, "");
}

function generateServiceDocsCards(serviceDocs: ServiceDoc[]): string {
  return `
<CardGrid>
${serviceDocs.map(generateServiceDocCard).join("\n")}
</CardGrid>
`;
}

function generateServiceDocCard(serviceDoc: ServiceDoc): string {
  const description = serviceDoc.description.trim();

  return `  <Card title=${JSON.stringify(serviceDoc.title)} icon="seti:aws">
${description.length > 0 ? `    ${escapeMdxText(description)}\n` : ""}
    [Read the ${escapeMdxText(serviceDoc.title)} docs](/services/${serviceDoc.slug}/)
  </Card>`;
}

function generateServiceSidebarItems(serviceDocs: ServiceDoc[]): string {
  return `\n${serviceDocs
    .map(
      (serviceDoc) =>
        `                { label: ${JSON.stringify(serviceDoc.title)}, slug: "services/${escapeJsString(serviceDoc.slug)}" },`,
    )
    .join("\n")}\n              `;
}

function stripSimulatedPrefix(title: string): string {
  return title.replace(/^Simulated\s+/i, "");
}

function escapeMdxText(value: string): string {
  return value.replaceAll("{", "\\{").replaceAll("}", "\\}");
}

function escapeJsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

async function replaceMarkedBlockInFile(
  path: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): Promise<void> {
  const text = await readFile(path, "utf8");
  const updatedText = replaceMarkedBlock(
    text,
    startMarker,
    endMarker,
    replacement,
  );

  await writeFile(path, updatedText);
}

function replaceMarkedBlock(
  text: string,
  startMarker: string,
  endMarker: string,
  replacement: string,
): string {
  const startIndex = text.indexOf(startMarker);

  if (startIndex === -1) {
    throw new Error(`Could not find start marker: ${startMarker}`);
  }

  const contentStartIndex = startIndex + startMarker.length;
  const endIndex = text.indexOf(endMarker, contentStartIndex);

  if (endIndex === -1) {
    throw new Error(`Could not find end marker: ${endMarker}`);
  }

  return `${text.slice(0, contentStartIndex)}${replacement}${text.slice(endIndex)}`;
}

function assertDirectoryExists(path: string, message: string): void {
  if (!existsSync(path)) {
    throw new Error(message);
  }
}

function assertFileExists(path: string, message: string): void {
  if (!existsSync(path)) {
    throw new Error(message);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

await main();
