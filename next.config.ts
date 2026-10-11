import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  poweredByHeader: false,
  // Native Node ESM requires .js specifiers in serverless functions.
  // Resolve those same specifiers to TypeScript sources for the static client build.
  webpack(config) {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
};
export default config;
