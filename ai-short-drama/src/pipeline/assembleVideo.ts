import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { escapeForSubtitlesFilter, probeDurationSeconds, runFfmpeg } from "../lib/ffmpeg.js";
import { logger } from "../logger.js";
import type { ShotAssets } from "../types.js";
import { buildSrt, type SubtitleSegment } from "./buildSubtitles.js";

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;
const TARGET_FPS = 30;

function shotSubtitleText(shot: ShotAssets["shot"]): string {
  const lines: string[] = [];
  if (shot.narration) {
    lines.push(shot.narration);
  }
  for (const line of shot.dialogue) {
    lines.push(`${line.speaker}：${line.line}`);
  }
  return lines.join("\n");
}

/**
 * 把單一鏡頭的影片片段與配音，正規化成統一解析度／幀率，並讓影片與音訊長度一致，
 * 輸出一個可以直接串接的 mp4。回傳實際使用的長度（秒），供字幕時間軸使用。
 */
async function normalizeShot(assets: ShotAssets, outputPath: string): Promise<number> {
  const videoDuration = await probeDurationSeconds(assets.videoPath);
  const audioDuration = assets.voiceoverPath
    ? await probeDurationSeconds(assets.voiceoverPath)
    : null;

  // 留一點緩衝，避免台詞被剛好卡斷
  const targetDuration = audioDuration
    ? Math.max(videoDuration, audioDuration + 0.4)
    : videoDuration;

  const videoPad = Math.max(0, targetDuration - videoDuration);
  const scaleAndPad =
    `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,` +
    `pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${TARGET_FPS}`;
  const videoFilter =
    videoPad > 0.01
      ? `${scaleAndPad},tpad=stop_mode=clone:stop_duration=${videoPad.toFixed(3)}[v]`
      : `${scaleAndPad}[v]`;

  const args = ["-i", assets.videoPath];
  let audioFilter: string;
  if (assets.voiceoverPath) {
    args.push("-i", assets.voiceoverPath);
    const audioPad = Math.max(0, targetDuration - (audioDuration ?? 0));
    audioFilter = audioPad > 0.01 ? `[1:a]apad=pad_dur=${audioPad.toFixed(3)}[a]` : `[1:a]anull[a]`;
  } else {
    args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");
    audioFilter = `[1:a]atrim=0:${targetDuration.toFixed(3)}[a]`;
  }

  args.push(
    "-filter_complex",
    `[0:v]${videoFilter};${audioFilter}`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    targetDuration.toFixed(3),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    outputPath,
  );

  await runFfmpeg(args);
  return targetDuration;
}

export interface AssembleOptions {
  shots: ShotAssets[];
  outputDir: string;
  finalPath: string;
  bgmPath?: string;
}

/** 把所有鏡頭串接、混音、燒字幕，輸出最終成品影片。 */
export async function assembleVideo(options: AssembleOptions): Promise<string> {
  logger.step("正規化各鏡頭片段（統一解析度／長度）");
  const normalizedPaths: string[] = [];
  const subtitleSegments: SubtitleSegment[] = [];
  let cursor = 0;

  for (let i = 0; i < options.shots.length; i++) {
    const assets = options.shots[i]!;
    const shotOutputPath = join(options.outputDir, `shot_${String(i + 1).padStart(3, "0")}.mp4`);
    const duration = await normalizeShot(assets, shotOutputPath);
    normalizedPaths.push(shotOutputPath);

    const text = shotSubtitleText(assets.shot);
    if (text) {
      subtitleSegments.push({ text, startSeconds: cursor, endSeconds: cursor + duration });
    }
    cursor += duration;
    logger.info(`[鏡頭 ${assets.shot.shotNumber}] 正規化完成，長度 ${duration.toFixed(1)}s`);
  }

  logger.step("串接所有鏡頭");
  const concatListPath = join(options.outputDir, "concat_list.txt");
  // 用絕對路徑，避免 concat demuxer 把路徑解析成「list 檔所在目錄」+「entry 路徑」造成重複拼接
  const concatList = normalizedPaths
    .map((p) => `file '${resolve(p).replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(concatListPath, concatList, "utf-8");

  const concatPath = join(options.outputDir, "concat.mp4");
  await runFfmpeg(["-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", concatPath]);

  logger.step("燒錄字幕" + (options.bgmPath ? "並混入背景音樂" : ""));
  const srtPath = join(options.outputDir, "captions.srt");
  await writeFile(srtPath, buildSrt(subtitleSegments), "utf-8");

  const escapedSrtPath = escapeForSubtitlesFilter(srtPath);
  const subtitleStyle =
    "force_style='FontName=Noto Sans CJK TC,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,MarginV=80'";

  const finalArgs = ["-i", concatPath];
  let filterComplex: string;
  if (options.bgmPath) {
    finalArgs.push("-stream_loop", "-1", "-i", options.bgmPath);
    filterComplex =
      `[0:v]subtitles='${escapedSrtPath}':${subtitleStyle}[v];` +
      `[1:a]volume=0.15,atrim=0:${cursor.toFixed(3)}[bgm];` +
      `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[a]`;
  } else {
    filterComplex = `[0:v]subtitles='${escapedSrtPath}':${subtitleStyle}[v];[0:a]anull[a]`;
  }

  finalArgs.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    cursor.toFixed(3),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    options.finalPath,
  );
  await runFfmpeg(finalArgs);

  logger.success(`成品影片已輸出 → ${options.finalPath}`);
  return options.finalPath;
}
