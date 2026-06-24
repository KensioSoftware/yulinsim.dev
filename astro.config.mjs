// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

const site = "https://yulinsim.dev";
const socialImage = `${site}/npm-yulin-aws-simulator.png`;

// https://astro.build/config
export default defineConfig({
  site: "https://yulinsim.dev",
  integrations: [
    starlight({
      title: "Yulin AWS Simulator",
      description:
        "Documentation for Yulin AWS simulator for tests, local development, and CI.",
      logo: {
        src: "./src/assets/yulin-aws-simulator.png",
        alt: "Yulin AWS simulator logo",
        replacesTitle: false,
      },
      favicon: "/favicon.png",
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: socialImage,
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: "Yulin AWS Simulator",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: socialImage,
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image:alt",
            content: "Yulin AWS Simulator",
          },
        },
      ],
      social: [
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/@kensio/yulin",
        },
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/KensioSoftware/yulin",
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [{ label: "Overview", slug: "" }],
        },
        {
          label: "Services",
          items: [
            { label: "CloudFormation", slug: "services/cloudformation" },
            { label: "CloudFront", slug: "services/cloudfront" },
            { label: "S3", slug: "services/s3" },
          ],
        },
      ],
    }),
  ],
});
