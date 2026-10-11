import { build } from "esbuild";
await build({
  entryPoints: ["src/server/cloud.ts"],
  outfile: ".server/cloud.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node24",
});
