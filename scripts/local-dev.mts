#!/usr/bin/env -S pnpm tsx

import { SimAws } from "@kensio/yulin";
import { serveSimAws } from "@kensio/yulin/serve";
import { join } from "node:path";

const simAws = new SimAws();
const srv = await serveSimAws({ simAws });

const templatePath = join(
  import.meta.dirname,
  "../cdk.out/YulinSimDevStack.template.json",
);

const stack = await simAws.cloudFormation().deployTemplateFile({
  templatePath,
});

const cfDomain = stack.outputs.get("DistributionDomainName")?.value;
if (typeof cfDomain !== "string") {
  throw new Error("CloudFront URL not found in outputs");
}
const localUrl = srv.localUrl(`http://${cfDomain}/`).toString();
console.log(localUrl);
