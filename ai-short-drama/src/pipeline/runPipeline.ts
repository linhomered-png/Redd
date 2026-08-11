import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../logger.js";
import { createVideoProvider } from "../providers/videoProvider.js";
import { createVoiceProvider } from "../providers/voiceProvider.js";
import type { PipelineOptions, Script } from "../types.js";
import { assembleVideo } from "./assembleVideo.js";
import { generateScript } from "./generateScript.js";
import { produceShotAssets } from "./produceShots.js";

function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug.slice(0, 60) : "short-drama";
}

export interface PipelineResult {
  script: Script;
  scriptPath: string;
  episodeVideoPaths: string[];
}

/**
 * 完整工作流：劇本 → 各鏡頭 AI 影片片段／配音 → 合成每一集的成品影片。
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const script = await generateScript(options);

  const projectDir = join(options.outputDir, slugify(script.title));
  await mkdir(projectDir, { recursive: true });

  const scriptPath = join(projectDir, "script.json");
  await writeFile(scriptPath, JSON.stringify(script, null, 2), "utf-8");
  logger.info(`劇本已存檔 → ${scriptPath}`);

  const videoProvider = createVideoProvider(options.mock);
  const voiceProvider = createVoiceProvider(options.mock);

  const episodeVideoPaths: string[] = [];
  for (const episode of script.episodes) {
    logger.step(`製作第 ${episode.episodeNumber} 集：${episode.title}`);

    const workDir = join(projectDir, `ep${String(episode.episodeNumber).padStart(2, "0")}_work`);
    const shotAssets = await produceShotAssets({
      shots: episode.shots,
      workDir,
      videoProvider,
      voiceProvider,
      voiceId: options.voiceId,
    });

    const finalPath = join(projectDir, `ep${String(episode.episodeNumber).padStart(2, "0")}.mp4`);
    await assembleVideo({
      shots: shotAssets,
      outputDir: workDir,
      finalPath,
      bgmPath: options.bgmPath,
    });
    episodeVideoPaths.push(finalPath);
  }

  logger.step("全部完成");
  for (const p of episodeVideoPaths) {
    logger.success(p);
  }

  return { script, scriptPath, episodeVideoPaths };
}
