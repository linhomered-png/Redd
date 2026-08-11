import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { env } from "../config.js";

/**
 * ffmpeg 的 `subtitles=` filter 用冒號分隔參數，路徑本身若含冒號（例如 Windows 磁碟機代號）
 * 或單引號，都需要跳脫，否則會被誤判為 filter 語法的一部分。
 */
export function escapeForSubtitlesFilter(path: string): string {
  return path.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function runProcess(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      reject(new Error(`無法執行 ${bin}：${err.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${bin} 執行失敗（exit code ${code}）：\n${stderr.slice(-4000)}`));
      }
    });
  });
}

function resolveFfmpegBin(): string {
  const bin = env.ffmpegPath ?? ffmpegPath;
  if (!bin) {
    throw new Error(
      "找不到 ffmpeg 執行檔（ffmpeg-static 沒有提供這個平台的二進位檔）。" +
        "請自行安裝系統版 ffmpeg，並設定 FFMPEG_PATH 環境變數指向它。",
    );
  }
  return bin;
}

function resolveFfprobeBin(): string {
  return env.ffprobePath ?? ffprobeStatic.path;
}

/** 執行 ffmpeg，自動加上 `-y`（覆蓋輸出檔案）。回傳 stdout。 */
export function runFfmpeg(args: string[]): Promise<string> {
  return runProcess(resolveFfmpegBin(), ["-y", ...args]);
}

/** 讀取媒體檔案的長度（秒）。 */
export async function probeDurationSeconds(filePath: string): Promise<number> {
  const output = await runProcess(resolveFfprobeBin(), [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number.parseFloat(output.trim());
  if (Number.isNaN(duration)) {
    throw new Error(`無法讀取媒體長度：${filePath}`);
  }
  return duration;
}

/** 產生一段指定長度的靜音 mp3（mock 配音使用，不需要任何外部 API）。 */
export async function generateSilentAudio(outputPath: string, durationSeconds: number): Promise<void> {
  await runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=mono:sample_rate=44100",
    "-t",
    String(durationSeconds),
    "-c:a",
    "libmp3lame",
    outputPath,
  ]);
}

/**
 * 產生一段純色卡＋文字的測試影片（mock 模式使用，不需要任何外部 API）。
 *
 * 注意：許多發行版的 ffmpeg 靜態編譯版（包含 ffmpeg-static 使用的版本）沒有內建
 * `drawtext` filter，所以這裡改用 `subtitles` filter（靠 libass，幾乎所有 ffmpeg
 * build 都有）搭配一個只有一行字幕的暫存 .srt 檔來燒字。
 */
export async function generateTestClip(options: {
  outputPath: string;
  durationSeconds: number;
  label: string;
  width: number;
  height: number;
  fps: number;
  colorIndex: number;
}): Promise<void> {
  const palette = ["0x2b2d42", "0x8d5524", "0x264653", "0x6a4c93", "0x1b4332", "0x780000"];
  const color = palette[options.colorIndex % palette.length];

  const labelSrtPath = `${options.outputPath}.label.srt`;
  const srtContent = `1\n00:00:00,000 --> 00:00:${String(Math.max(1, Math.ceil(options.durationSeconds))).padStart(2, "0")},000\n${options.label.replace(/\r?\n/g, "\n")}\n`;
  await writeFile(labelSrtPath, srtContent, "utf-8");
  const escapedSrtPath = escapeForSubtitlesFilter(labelSrtPath);

  await runFfmpeg([
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=${options.width}x${options.height}:d=${options.durationSeconds}:r=${options.fps}`,
    "-f",
    "lavfi",
    "-i",
    `anullsrc=channel_layout=stereo:sample_rate=44100`,
    "-vf",
    // Alignment=8：靠上置中，避免跟正式合成時燒在畫面下方的字幕（見 assembleVideo.ts）重疊
    `subtitles='${escapedSrtPath}':force_style='FontSize=20,PrimaryColour=&H00FFFFFF,BorderStyle=3,Outline=1,Alignment=8,MarginV=60'`,
    "-t",
    String(options.durationSeconds),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    options.outputPath,
  ]);
}
