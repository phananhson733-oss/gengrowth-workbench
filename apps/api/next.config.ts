import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const config: NextConfig = {
  // The vendored engines ship as TypeScript sources, exactly as in nevermore.
  transpilePackages: ["@sf/public-tools", "@sf/sources"],
  // The app sits two levels below the workspace root that holds its packages.
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
};

export default config;
