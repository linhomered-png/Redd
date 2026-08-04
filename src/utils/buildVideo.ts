import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { MediaItem, VideoSettings } from "../types";
import { renderPhotoToFrame } from "./resizeImage";
import { renderTextCardToFrame } from "./textCard";

export interface BuildProgress {
  stage: "preparing" | "encoding" | "done";
  ratio: number;
}

function extensionFromFile(file: File, fallback: string): string {
  const fromName = file.name.split(".").pop();
  if (fromName && /^[a-zA-Z0-9]{2,5}$/.test(fromName)) return fromName;
  return fallback;
}

export async function buildVideo(
  ffmpeg: FFmpeg,
  items: MediaItem[],
  settings: VideoSettings,
  onProgress: (progress: BuildProgress) => void,
): Promise<Blob> {
  const { width, height } = settings.resolution;
  const inputNames: string[] = [];

  onProgress({ stage: "preparing", ratio: 0 });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "video") {
      const name = `clip${i}.${extensionFromFile(item.file as File, "mp4")}`;
      await ffmpeg.writeFile(name, await fetchFile(item.file as File));
      inputNames.push(name);
    } else {
      const frame =
        item.kind === "text"
          ? await renderTextCardToFrame(item.text ?? "", width, height, {
              bgColor: item.bgColor ?? "#12233f",
              textColor: item.textColor ?? "#ffffff",
            })
          : await renderPhotoToFrame(item.file as File, width, height);
      const name = `clip${i}.${item.kind === "text" ? "png" : "jpg"}`;
      await ffmpeg.writeFile(name, await fetchFile(frame));
      inputNames.push(name);
    }
    onProgress({ stage: "preparing", ratio: (i + 1) / items.length });
  }

  let musicName: string | null = null;
  if (settings.musicFile) {
    musicName = `music.${extensionFromFile(settings.musicFile, "mp3")}`;
    await ffmpeg.writeFile(musicName, await fetchFile(settings.musicFile));
  }

  const args = buildFfmpegArgs(items, settings, inputNames, musicName);

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress({ stage: "encoding", ratio: Math.min(1, Math.max(0, progress)) });
  };
  ffmpeg.on("progress", progressHandler);

  let exitCode: number;
  try {
    exitCode = await ffmpeg.exec(args);
  } finally {
    ffmpeg.off("progress", progressHandler);
  }
  if (exitCode !== 0) {
    throw new Error(`ffmpeg 執行失敗（結束碼 ${exitCode}）`);
  }

  const data = await ffmpeg.readFile("output.mp4");
  const bytes = data as Uint8Array;
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  for (const name of inputNames) await ffmpeg.deleteFile(name);
  if (musicName) await ffmpeg.deleteFile(musicName);
  await ffmpeg.deleteFile("output.mp4");

  onProgress({ stage: "done", ratio: 1 });
  return new Blob([arrayBuffer], { type: "video/mp4" });
}

function buildFfmpegArgs(
  items: MediaItem[],
  settings: VideoSettings,
  inputNames: string[],
  musicName: string | null,
): string[] {
  const useFade = settings.transition === "fade";
  const t = useFade ? settings.transitionDuration : 0;
  const args: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const clipLen = items[i].duration + t;
    if (items[i].kind === "video") {
      args.push("-t", `${clipLen}`, "-i", inputNames[i]);
    } else {
      args.push("-loop", "1", "-t", `${clipLen}`, "-i", inputNames[i]);
    }
  }
  if (musicName) {
    args.push("-stream_loop", "-1", "-i", musicName);
  }

  const filterParts: string[] = [];
  for (let i = 0; i < items.length; i++) {
    filterParts.push(
      `[${i}:v]scale=${settings.resolution.width}:${settings.resolution.height}:force_original_aspect_ratio=decrease,pad=${settings.resolution.width}:${settings.resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${settings.fps},format=yuv420p[v${i}]`,
    );
  }

  let totalDuration: number;
  if (items.length === 1) {
    filterParts.push(`[v0]null[vout]`);
    totalDuration = items[0].duration;
  } else if (useFade) {
    let lastLabel = "v0";
    let cumulative = items[0].duration;
    for (let i = 1; i < items.length; i++) {
      const outLabel = i === items.length - 1 ? "vout" : `x${i}`;
      filterParts.push(
        `[${lastLabel}][v${i}]xfade=transition=fade:duration=${t}:offset=${cumulative}[${outLabel}]`,
      );
      lastLabel = outLabel;
      cumulative += items[i].duration - t;
    }
    totalDuration = cumulative + t;
  } else {
    const labels = items.map((_, i) => `[v${i}]`).join("");
    filterParts.push(`${labels}concat=n=${items.length}:v=1:a=0[vout]`);
    totalDuration = items.reduce((sum, item) => sum + item.duration, 0);
  }

  args.push("-filter_complex", filterParts.join(";"));
  args.push("-map", "[vout]");
  if (musicName) {
    args.push("-map", `${items.length}:a`);
  }
  args.push("-c:v", "libx264", "-preset", "ultrafast", "-t", `${totalDuration}`);
  if (musicName) {
    args.push("-c:a", "aac", "-b:a", "128k");
  }
  args.push("-y", "output.mp4");
  return args;
}
