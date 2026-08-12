#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { logger } from "./logger.js";
import { runPipeline } from "./pipeline/runPipeline.js";
import { VIDEO_PROVIDER_NAMES, type VideoProviderName } from "./providers/videoProvider.js";
import { VOICE_PROVIDER_NAMES, type VoiceProviderName } from "./providers/voiceProvider.js";
import type { PipelineOptions } from "./types.js";

function parseChoice<T extends string>(choices: readonly T[]) {
  return (value: string): T => {
    if (!(choices as readonly string[]).includes(value)) {
      throw new InvalidArgumentError(`必須是 ${choices.join(" / ")} 其中之一。`);
    }
    return value as T;
  };
}

const program = new Command();

program
  .name("ai-short-drama")
  .description("自動化 AI 短劇工作流：劇本 → AI 影片片段／配音／字幕 → 用 ffmpeg 合成成品影片")
  .requiredOption("-t, --topic <topic>", "短劇主題／題材，例如「重生復仇」")
  .option("-g, --genre <genre>", "類型標籤，例如「都市情感」「懸疑」")
  .option("-e, --episodes <n>", "集數", (v) => Number.parseInt(v, 10), 1)
  .option("-s, --shots-per-episode <n>", "每集大約鏡頭數", (v) => Number.parseInt(v, 10), 8)
  .option("-l, --language <language>", "台詞／旁白語言", "繁體中文")
  .option("-o, --output <dir>", "輸出目錄", "./output")
  .option("--bgm <path>", "背景音樂檔案路徑（選填）")
  .option("--voice-id <id>", "配音的語音 ID／voice name（覆蓋 .env 設定）")
  .option("--script-max-tokens <n>", "生成劇本時的 max_tokens 上限", (v) => Number.parseInt(v, 10), 16000)
  .option(
    "--video-provider <name>",
    `影片片段生成方式：${VIDEO_PROVIDER_NAMES.join(" / ")}（kenburns 免費：AI 生圖＋Ken Burns 動態效果；runway 付費：需要 RUNWAY_API_KEY）`,
    parseChoice(VIDEO_PROVIDER_NAMES),
    "kenburns",
  )
  .option(
    "--voice-provider <name>",
    `配音生成方式：${VOICE_PROVIDER_NAMES.join(" / ")}（edge 免費：借用 Microsoft Edge 線上朗讀；elevenlabs 付費：需要 ELEVENLABS_API_KEY）`,
    parseChoice(VOICE_PROVIDER_NAMES),
    "edge",
  )
  .option(
    "--mock",
    "完全不呼叫任何外部服務，用假劇本＋色卡影片跑一次完整流程，用來驗證環境設定是否正確",
    false,
  )
  .action(async (opts: {
    topic: string;
    genre?: string;
    episodes: number;
    shotsPerEpisode: number;
    language: string;
    output: string;
    bgm?: string;
    voiceId?: string;
    scriptMaxTokens: number;
    videoProvider: VideoProviderName;
    voiceProvider: VoiceProviderName;
    mock: boolean;
  }) => {
    const options: PipelineOptions = {
      topic: opts.topic,
      genre: opts.genre,
      episodeCount: opts.episodes,
      shotsPerEpisode: opts.shotsPerEpisode,
      language: opts.language,
      outputDir: opts.output,
      mock: opts.mock,
      bgmPath: opts.bgm,
      voiceId: opts.voiceId,
      scriptMaxTokens: opts.scriptMaxTokens,
      videoProvider: opts.videoProvider,
      voiceProvider: opts.voiceProvider,
    };

    try {
      await runPipeline(options);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
