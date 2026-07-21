import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { Photo, VideoSettings } from "../types";
import { renderPhotoToFrame } from "./resizeImage";

export interface BuildProgress {
  stage: "preparing" | "encoding" | "done";
  ratio: number;
}

function musicExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 4) return fromName;
  if (file.type === "audio/wav") return "wav";
  if (file.type === "audio/ogg") return "ogg";
  return "mp3";
}

export async function buildVideo(
  ffmpeg: FFmpeg,
  photos: Photo[],
  settings: VideoSettings,
  onProgress: (progress: BuildProgress) => void,
): Promise<Blob> {
  const { width, height } = settings.resolution;
  const inputNames: string[] = [];

  onProgress({ stage: "preparing", ratio: 0 });

  for (let i = 0; i < photos.length; i++) {
    const frame = await renderPhotoToFrame(photos[i].file, width, height);
    const name = `img${i}.jpg`;
    await ffmpeg.writeFile(name, await fetchFile(frame));
    inputNames.push(name);
    onProgress({ stage: "preparing", ratio: (i + 1) / photos.length });
  }

  let musicName: string | null = null;
  if (settings.musicFile) {
    musicName = `music.${musicExtension(settings.musicFile)}`;
    await ffmpeg.writeFile(musicName, await fetchFile(settings.musicFile));
  }

  const args =
    settings.transition === "fade"
      ? buildXfadeArgs(photos, settings, inputNames, musicName)
      : await buildConcatArgs(ffmpeg, photos, settings, inputNames, musicName);

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
    throw new Error(`ffmpeg exited with code ${exitCode} (args: ${args.join(" ")})`);
  }

  const data = await ffmpeg.readFile("output.mp4");
  const bytes = data as Uint8Array;
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  for (const name of inputNames) await ffmpeg.deleteFile(name);
  if (musicName) await ffmpeg.deleteFile(musicName);
  if (settings.transition === "none") await ffmpeg.deleteFile("list.txt");
  await ffmpeg.deleteFile("output.mp4");

  onProgress({ stage: "done", ratio: 1 });
  return new Blob([arrayBuffer], { type: "video/mp4" });
}

async function buildConcatArgs(
  ffmpeg: FFmpeg,
  photos: Photo[],
  settings: VideoSettings,
  inputNames: string[],
  musicName: string | null,
): Promise<string[]> {
  const lines: string[] = [];
  for (let i = 0; i < inputNames.length; i++) {
    lines.push(`file '${inputNames[i]}'`);
    lines.push(`duration ${photos[i].duration}`);
  }
  // The concat demuxer ignores the duration of the final entry, so it must
  // be repeated once more without a duration directive.
  lines.push(`file '${inputNames[inputNames.length - 1]}'`);
  await ffmpeg.writeFile("list.txt", new TextEncoder().encode(lines.join("\n")));

  const args = ["-f", "concat", "-safe", "0", "-i", "list.txt"];
  const totalDuration = photos.reduce((sum, p) => sum + p.duration, 0);

  if (musicName) {
    args.push("-stream_loop", "-1", "-i", musicName);
  }

  args.push(
    "-vf",
    `fps=${settings.fps},format=yuv420p`,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-t",
    `${totalDuration}`,
  );
  if (musicName) {
    args.push("-c:a", "aac", "-b:a", "128k", "-shortest");
  }
  args.push("-y", "output.mp4");
  return args;
}

function buildXfadeArgs(
  photos: Photo[],
  settings: VideoSettings,
  inputNames: string[],
  musicName: string | null,
): string[] {
  const t = settings.transitionDuration;
  const args: string[] = [];

  for (let i = 0; i < inputNames.length; i++) {
    const clipLen = photos[i].duration + t;
    args.push("-loop", "1", "-t", `${clipLen}`, "-i", inputNames[i]);
  }
  if (musicName) {
    args.push("-stream_loop", "-1", "-i", musicName);
  }

  const filterParts: string[] = [];
  for (let i = 0; i < inputNames.length; i++) {
    filterParts.push(
      `[${i}:v]scale=${settings.resolution.width}:${settings.resolution.height}:force_original_aspect_ratio=decrease,pad=${settings.resolution.width}:${settings.resolution.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${settings.fps},format=yuv420p[v${i}]`,
    );
  }

  if (inputNames.length === 1) {
    args.push("-filter_complex", filterParts.join(";"));
    args.push("-map", "[v0]");
  } else {
    let lastLabel = "v0";
    let cumulative = photos[0].duration;
    for (let i = 1; i < inputNames.length; i++) {
      const outLabel = i === inputNames.length - 1 ? "vout" : `x${i}`;
      filterParts.push(
        `[${lastLabel}][v${i}]xfade=transition=fade:duration=${t}:offset=${cumulative}[${outLabel}]`,
      );
      lastLabel = outLabel;
      cumulative += photos[i].duration - t;
    }
    args.push("-filter_complex", filterParts.join(";"));
    args.push("-map", "[vout]");
  }

  const totalDuration = photos.reduce(
    (sum, p, i) => (i === 0 ? p.duration : sum + p.duration - t),
    0,
  );

  if (musicName) {
    args.push("-map", `${inputNames.length}:a`);
  }
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-t",
    `${totalDuration}`,
  );
  if (musicName) {
    args.push("-c:a", "aac", "-b:a", "128k");
  }
  args.push("-y", "output.mp4");
  return args;
}
