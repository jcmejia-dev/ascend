import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
// OneDrive directory reparse points can make Next.js cache cleanup fail with EPERM.
// Preserve the generated cache instead of deleting it. User records are in IndexedDB.
if (process.platform === "win32" && existsSync(".next")) {
  const source = path.resolve(".next"),
    workspace = path.resolve("work"),
    target = path.join(workspace, `build-cache-${Date.now()}`);
  if (
    path.dirname(source) !== process.cwd() ||
    !target.startsWith(workspace + path.sep)
  )
    throw new Error("Invalid build-cache location.");
  mkdirSync(workspace, { recursive: true });
  renameSync(source, target);
  console.log(
    "Preserved previous generated build cache in " +
      path.relative(process.cwd(), target),
  );
}
