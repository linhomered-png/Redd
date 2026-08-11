import { config as loadDotenv } from "dotenv";

loadDotenv();

export const env = {
  anthropicApiKey: process.env["ANTHROPIC_API_KEY"] ?? "",

  runwayApiKey: process.env["RUNWAY_API_KEY"] ?? "",
  runwayApiBaseUrl: process.env["RUNWAY_API_BASE_URL"] ?? "https://api.dev.runwayml.com",
  runwayApiVersion: process.env["RUNWAY_API_VERSION"] ?? "2024-11-06",
  runwayVideoModel: process.env["RUNWAY_VIDEO_MODEL"] ?? "gen4_turbo",
  runwayImageModel: process.env["RUNWAY_IMAGE_MODEL"] ?? "gen4_image",

  elevenLabsApiKey: process.env["ELEVENLABS_API_KEY"] ?? "",
  elevenLabsVoiceId: process.env["ELEVENLABS_VOICE_ID"] ?? "21m00Tcm4TlvDq8ikWAM",

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
