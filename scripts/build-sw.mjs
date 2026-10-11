import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name),
      ),
    )
  ).flat();
}
const files = (await walk("out")).filter(
  (f) =>
    (/\.(js|css|woff2|png|svg|webmanifest)$/.test(f) && !f.endsWith("sw.js")) ||
    f.endsWith("runner.html"),
);
const urls = [
  "/",
  ...files.map((f) => "/" + path.relative("out", f).split(path.sep).join("/")),
];
const hash = createHash("sha256");
hash.update(await readFile("out/index.html"));
for (const f of files) hash.update(await readFile(f));
const version = hash.digest("hex").slice(0, 16);
const code = `// Generated from this build. Never edit this file by hand.
const CACHE='ascend-${version}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ascend-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname==='/runner.html'?'/runner.html':'/')).then(response=>response||fetch(event.request)));return;}
 if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(response=>response||fetch(event.request)));
});
`;
await writeFile("out/sw.js", code);
console.log(`Offline shell: ${urls.length} assets, build ${version}`);
