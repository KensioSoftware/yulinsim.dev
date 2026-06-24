// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

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
