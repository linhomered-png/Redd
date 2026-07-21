// Copies the @ffmpeg/core wasm build into public/ so it is served same-origin,
// avoiding any runtime dependency on a third-party CDN.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(rootDir, "node_modules/@ffmpeg/core/dist/esm");
const destDir = join(rootDir, "public/ffmpeg-core");

mkdirSync(destDir, { recursive: true });
for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}
console.log("Copied ffmpeg-core assets to public/ffmpeg-core");
