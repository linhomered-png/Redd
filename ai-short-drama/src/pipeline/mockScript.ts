import type { PipelineOptions, Script } from "../types.js";

/**
 * 不呼叫任何 API，直接產生一份結構正確的假劇本，方便在沒有金鑰的情況下
 * 測試「劇本 → 影片片段 → 配音 → 合成」整條流水線是否接得起來。
 */
export function buildMockScript(options: PipelineOptions): Script {
  const shotsPerEpisode = Math.max(1, options.shotsPerEpisode);
  return {
    title: `【測試劇本】${options.topic}`,
    logline: `這是 --mock 模式自動產生的假劇本，用於在沒有 API 金鑰時測試整條流水線。主題：${options.topic}`,
    characters: [
      { name: "女主角", description: "young woman, sharp eyes, modern business attire, black hair in a low bun" },
      { name: "男主角", description: "man in his 30s, tailored suit, calm but intense expression" },
    ],
    episodes: Array.from({ length: options.episodeCount }, (_, episodeIndex) => {
      const episodeNumber = episodeIndex + 1;
      return {
        episodeNumber,
        title: `第 ${episodeNumber} 集：${options.topic}`,
        hook: `第 ${episodeNumber} 集開場鉤子（mock）`,
        shots: Array.from({ length: shotsPerEpisode }, (_, shotIndex) => {
          const shotNumber = shotIndex + 1;
          return {
            shotNumber,
            durationSeconds: 5,
            visualPrompt: `Cinematic shot ${shotNumber} of episode ${episodeNumber}, dramatic lighting, city skyline background, slow push-in camera movement`,
            cameraMovement: "slow push-in",
            narration: shotIndex % 3 === 0 ? `這是第 ${shotNumber} 個鏡頭的旁白（mock）。` : null,
            dialogue:
              shotIndex % 3 === 1
                ? [{ speaker: "女主角", line: `第 ${shotNumber} 個鏡頭的台詞（mock）。` }]
                : [],
          };
        }),
      };
    }),
  };
}
