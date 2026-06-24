#!/usr/bin/env node

import * as cdk from "aws-cdk-lib";
import { YulinSimDevStack } from "../lib/yulinsim-dev-stack";

const app = new cdk.App();

new YulinSimDevStack(app, "YulinSimDevStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});
