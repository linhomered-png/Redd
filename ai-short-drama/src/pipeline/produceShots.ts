import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../logger.js";
import type { VideoProvider } from "../providers/videoProvider.js";
import type { VoiceProvider } from "../providers/voiceProvider.js";
import type { Shot, ShotAssets } from "../types.js";

function shotVoiceoverText(shot: Shot): string | null {
  const parts: string[] = [];
  if (shot.narration) {
    parts.push(shot.narration);
  }
  for (const line of shot.dialogue) {
    parts.push(line.line);
  }
  const combined = parts.join(" ").trim();
  return combined.length > 0 ? combined : null;
}

export interface ProduceShotsOptions {
  shots: Shot[];
  workDir: string;
  videoProvider: VideoProvider;
  voiceProvider: VoiceProvider;
  voiceId: string | undefined;
}

/** 依序為每個鏡頭生成影片片段與配音（若有台詞／旁白）。 */
export async function produceShotAssets(options: ProduceShotsOptions): Promise<ShotAssets[]> {
  await mkdir(options.workDir, { recursive: true });
  const results: ShotAssets[] = [];

  for (let i = 0; i < options.shots.length; i++) {
    const shot = options.shots[i]!;
    logger.step(`鏡頭 ${shot.shotNumber}／${options.shots.length}`);

    const videoPath = join(options.workDir, `shot_${String(i + 1).padStart(3, "0")}_raw.mp4`);
    await options.videoProvider.generateClip(shot, videoPath, i);

    let voiceoverPath: string | null = null;
    const text = shotVoiceoverText(shot);
    if (text) {
      const candidatePath = join(options.workDir, `shot_${String(i + 1).padStart(3, "0")}_voice.mp3`);
      const ok = await options.voiceProvider.synthesize(text, candidatePath, options.voiceId);
      if (ok) {
        voiceoverPath = candidatePath;
        logger.info(`[鏡頭 ${shot.shotNumber}] 配音完成`);
      } else {
        logger.warn(`[鏡頭 ${shot.shotNumber}] 沒有設定配音金鑰，跳過配音`);
      }
    }

    results.push({ shot, videoPath, voiceoverPath, voiceoverDurationSeconds: null });
  }

  return results;
}
