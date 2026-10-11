import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { tutorRequest } from "./tutor-proxy.mjs";
import { createAuth } from "../.server/auth.mjs";
const accounts = createAuth();
const root = path.resolve("out"),
  types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
  };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (
      pathname.startsWith("/api/auth/") ||
      pathname === "/api/workspace" ||
      pathname === "/api/course-search"
    ) {
      await accounts.handle(req, res);
      return;
    }
    if (pathname === "/api/tutor") {
      await tutorRequest(req, res);
      return;
    }
    let filename = path.resolve(root, "." + pathname);
    if (filename !== root && !filename.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(filename)).isDirectory())
      filename = path.join(filename, "index.html");
    const data = await readFile(filename);
    res.writeHead(200, {
      "Content-Type":
        types[path.extname(filename)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        pathname === "/runner.html"
          ? "default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'"
          : "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      "Cache-Control":
        pathname === "/sw.js" || path.extname(filename) === ".html"
          ? "no-cache"
          : "public, max-age=3600",
      "Service-Worker-Allowed": "/",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}).listen(4173, process.env.ASCEND_ORIGIN ? "0.0.0.0" : "127.0.0.1", () =>
  console.log(
    "ASCEND: http://localhost:4173 (Android installation needs an HTTPS deployment)",
  ),
);
