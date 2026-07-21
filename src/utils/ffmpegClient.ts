import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// Served same-origin (copied from node_modules/@ffmpeg/core by
// scripts/copy-ffmpeg-core.mjs) so the app has no third-party CDN dependency.
const BASE_URL = "/ffmpeg-core";

let ffmpegPromise: Promise<FFmpeg> | null = null;

export function loadFfmpeg(onLog?: (message: string) => void): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      if (onLog) {
        ffmpeg.on("log", ({ message }) => onLog(message));
      }
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(`${BASE_URL}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await ffmpeg.load({ coreURL, wasmURL });
      return ffmpeg;
    })();
  }
  return ffmpegPromise;
}
