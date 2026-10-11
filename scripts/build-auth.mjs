import { build } from "esbuild";
await build({
  entryPoints: ["scripts/auth.ts"],
  outfile: ".server/auth.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node24",
});
