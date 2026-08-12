import { config as loadDotenv } from "dotenv";

loadDotenv();

export const env = {
  anthropicApiKey: process.env["ANTHROPIC_API_KEY"] ?? "",

  runwayApiKey: process.env["RUNWAY_API_KEY"] ?? "",
  runwayApiBaseUrl: process.env["RUNWAY_API_BASE_URL"] ?? "https://api.dev.runwayml.com",
  runwayApiVersion: process.env["RUNWAY_API_VERSION"] ?? "2024-11-06",
  runwayVideoModel: process.env["RUNWAY_VIDEO_MODEL"] ?? "gen4_turbo",
  runwayImageModel: process.env["RUNWAY_IMAGE_MODEL"] ?? "gen4_image",

  // fal.ai（--video-provider seedance）—— ByteDance Seedance 2.0，透過 fal.ai 存取
  falApiKey: process.env["FAL_KEY"] ?? "",
  falApiBaseUrl: process.env["FAL_API_BASE_URL"] ?? "https://queue.fal.run",
  seedanceModel: process.env["SEEDANCE_MODEL"] ?? "bytedance/seedance-2.0/text-to-video",
  seedanceResolution: process.env["SEEDANCE_RESOLUTION"] ?? "720p",

  elevenLabsApiKey: process.env["ELEVENLABS_API_KEY"] ?? "",
  elevenLabsVoiceId: process.env["ELEVENLABS_VOICE_ID"] ?? "21m00Tcm4TlvDq8ikWAM",

  // 免費文生圖（Pollinations.ai，不需要金鑰）—— 用於 --video-provider kenburns
  pollinationsModel: process.env["POLLINATIONS_MODEL"] ?? "flux",
  imageWidth: Number.parseInt(process.env["IMAGE_WIDTH"] ?? "1080", 10),
  imageHeight: Number.parseInt(process.env["IMAGE_HEIGHT"] ?? "1920", 10),

  // 免費配音（edge-tts，借用 Microsoft Edge 的線上朗讀引擎，不需要金鑰）—— 用於 --voice-provider edge
  edgeTtsVoice: process.env["EDGE_TTS_VOICE"] ?? "zh-TW-HsiaoChenNeural",

  ffmpegPath: process.env["FFMPEG_PATH"],
  ffprobePath: process.env["FFPROBE_PATH"],
};

/**
 * 確認必要的環境變數已設定，否則丟出清楚的中文錯誤訊息。
 */
export function requireEnv(value: string, name: string, hint?: string): string {
  if (!value) {
    const suffix = hint ? ` ${hint}` : "";
    throw new Error(`缺少必要的環境變數 ${name}。${suffix}`.trim());
  }
  return value;
}
