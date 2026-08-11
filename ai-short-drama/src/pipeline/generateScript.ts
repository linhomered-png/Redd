import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env, requireEnv } from "../config.js";
import { logger } from "../logger.js";
import { scriptSchema } from "../schema.js";
import type { PipelineOptions, Script } from "../types.js";
import { buildMockScript } from "./mockScript.js";

const SYSTEM_PROMPT = `你是短劇編劇兼分鏡師，專門創作用於 AI 影片生成模型的短劇（vertical micro-drama）劇本。

規則：
- 每個鏡頭（shot）的 durationSeconds 必須落在 4 到 10 之間 —— 這是文字／圖片轉影片模型單次穩定產出的長度上限，不能超過。
- visualPrompt 一律用英文撰寫，具體描述畫面主體、動作、場景、鏡頭運動、光線與氛圍；不要包含對白文字，讓文字轉影片模型可以直接拿去用。
- narration 與 dialogue 裡的 line 用使用者指定的語言撰寫，語氣要符合短劇「強衝突、強反轉、強情緒」的風格。
- characters 陣列列出所有出場角色，並提供一致的外觀描述（給生圖模型用的英文描述：髮型、五官特徵、服裝風格等），確保同一角色在跨鏡頭時形象一致。
- 每一集的第一個鏡頭要有能在 3 秒內抓住注意力的鉤子（hook），結尾鏡頭要留下懸念，讓觀眾想看下一集。
- 只透過 characters 陣列與 shots 的內容說故事，不要輸出任何 schema 以外的文字。`;

/**
 * 呼叫 Claude 生成劇本並拆解成鏡頭腳本，用 structured outputs 保證回傳合法 JSON。
 */
export async function generateScript(options: PipelineOptions): Promise<Script> {
  if (options.mock) {
    logger.step("Mock 模式：略過 Claude API，直接產生假劇本");
    return buildMockScript(options);
  }

  const apiKey = requireEnv(
    env.anthropicApiKey,
    "ANTHROPIC_API_KEY",
    "請至 https://console.anthropic.com 建立金鑰，或改用 --mock 測試流程。",
  );
  const client = new Anthropic({ apiKey });

  logger.step("使用 Claude 生成劇本與分鏡腳本");

  const userPrompt = `題材／主題：${options.topic}
類型：${options.genre ?? "都市情感／反轉"}
集數：${options.episodeCount}
每集鏡頭數：約 ${options.shotsPerEpisode} 個
台詞／旁白語言：${options.language}`;

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: options.scriptMaxTokens,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(scriptSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude 拒絕了這個請求（safety refusal），請調整題材後再試一次。");
  }
  if (!response.parsed_output) {
    throw new Error(
      "Claude 沒有回傳可解析的劇本 JSON（可能因為 max_tokens 不夠而被截斷）。" +
        "請減少集數／鏡頭數，或用 --script-max-tokens 提高上限後再試一次。",
    );
  }

  const script = response.parsed_output;
  const totalShots = script.episodes.reduce((sum, ep) => sum + ep.shots.length, 0);
  logger.success(`劇本生成完成：《${script.title}》，共 ${script.episodes.length} 集、${totalShots} 個鏡頭`);
  return script;
}
