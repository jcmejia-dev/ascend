// Simulate Vercel's unbundled ESM TypeScript-to-JavaScript function output.
// A passing Next.js build alone does not verify that Node can load /api routes.
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from "node:fs/promises";
import { join, dirname, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { transform } from "esbuild";

const root = process.cwd();
const temp = await mkdtemp(join(root, ".ascend-esm-check-"));
const entries = [
  "api/auth/session.ts", "api/auth/login.ts", "api/auth/register.ts",
  "api/auth/logout.ts", "api/workspace.ts", "api/course-search.ts",
];
const seen = new Set();
async function existing(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}
async function compile(file) {
  const absolute = resolve(root, file);
  if (!absolute.startsWith(root + "/") && absolute !== root)
    throw new Error("Import outside project: " + file);
  const normalized = relative(root, absolute).replaceAll("\\", "/");
  if (seen.has(normalized)) return;
  seen.add(normalized);
  const input = await readFile(absolute, "utf8");
  const { code } = await transform(input, {
    loader: normalized.endsWith(".tsx") ? "tsx" : normalized.endsWith(".ts") ? "ts" : "js",
    format: "esm", target: "node22",
  });
  const out = join(temp, normalized.replace(/\.(ts|tsx)$/, ".js"));
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, code);
  // Match actual emitted import/export statements, not lesson text strings.
  const imports = [...code.matchAll(/^\s*(?:import|export|})[^\n]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']/gm)];
  for (const match of imports) {
    const specifier = match[1];
    if (!/\.(?:js|mjs|cjs|json)$/.test(specifier))
      throw new Error("Node ESM cannot resolve extensionless import " + specifier + " in " + normalized);
    if (!specifier.endsWith(".js")) continue;
    const target = resolve(dirname(absolute), specifier);
    const candidates = [target.replace(/\.js$/, ".ts"), target.replace(/\.js$/, ".tsx"), target];
    let found;
    for (const candidate of candidates) if (await existing(candidate)) { found = candidate; break; }
    if (!found) throw new Error("Missing source module " + specifier + " in " + normalized);
    await compile(relative(root, found));
  }
}
try {
  for (const entry of entries) await compile(entry);
  for (const entry of entries) {
    const output = join(temp, entry.replace(/\.ts$/, ".js"));
    const module = await import(pathToFileURL(output).href);
    if (typeof module.default !== "function")
      throw new Error("Missing default API handler: " + entry);
    console.log("PASS: Node ESM loaded", entry);
  }
  console.log("All Vercel API entry points load as native Node ESM.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
