import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
await mkdir("public/fonts", { recursive: true });
for (const size of [192, 512])
  await sharp("public/icon.svg")
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
// Safe-zone maskable icon: the mark fits inside the central 80% of the canvas.
const mark = await sharp("public/icon.svg").resize(410, 410).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#0d0f12" },
})
  .composite([{ input: mark, left: 51, top: 51 }])
  .png()
  .toFile("public/icons/maskable-512.png");
await copyFile(
  "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  "public/fonts/geist-latin.woff2",
);
await copyFile(
  "node_modules/@fontsource-variable/geist/LICENSE",
  "public/fonts/LICENSE.txt",
);
