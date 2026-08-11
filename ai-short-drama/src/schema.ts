import { z } from "zod";

// 這個 schema 同時用於：
// 1. 呼叫 Claude 時的 structured output（output_config.format），保證回傳一定是合法 JSON。
// 2. 驗證 mock 模式或手動修改過的劇本檔案。
//
// 結構化輸出不支援數值範圍限制（min/max）與遞迴 schema，因此鏡頭時長等限制
// 改用系統提示詞（見 generateScript.ts）約束，而非寫進 schema 裡。

export const dialogueLineSchema = z.object({
  speaker: z.string(),
  line: z.string(),
});

export const shotSchema = z.object({
  shotNumber: z.number().int(),
  durationSeconds: z.number(),
  visualPrompt: z.string(),
  cameraMovement: z.string(),
  narration: z.string().nullable(),
  dialogue: z.array(dialogueLineSchema),
});

export const episodeSchema = z.object({
  episodeNumber: z.number().int(),
  title: z.string(),
  hook: z.string(),
  shots: z.array(shotSchema),
});

export const characterProfileSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const scriptSchema = z.object({
  title: z.string(),
  logline: z.string(),
  characters: z.array(characterProfileSchema),
  episodes: z.array(episodeSchema),
});
