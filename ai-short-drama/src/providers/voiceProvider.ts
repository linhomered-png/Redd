import { writeFile } from "node:fs/promises";
import { env } from "../config.js";
import { generateSilentAudio } from "../lib/ffmpeg.js";

export interface VoiceProvider {
  /**
   * 為一段文字生成配音音檔（mp3），寫到 outputPath。
   * 回傳 false 代表這個 provider 沒有可用的金鑰／設定，呼叫端應該跳過配音。
   */
  synthesize(text: string, outputPath: string, voiceId?: string): Promise<boolean>;
}

/** Mock 配音：直接產生一段對應文字長度的靜音音檔，方便測試合成流程的時間軸邏輯。 */
export class MockVoiceProvider implements VoiceProvider {
  async synthesize(text: string, outputPath: string): Promise<boolean> {
    // 粗略估計：中文字約每秒 4 字，用來讓 mock 配音時長貼近真實配音。
    const estimatedSeconds = Math.max(1.5, text.length / 4);
    await generateSilentAudio(outputPath, estimatedSeconds);
    return true;
  }
}

/**
 * 使用 ElevenLabs 的 text-to-speech API。若沒有設定 ELEVENLABS_API_KEY，
 * synthesize() 會回傳 false，讓呼叫端知道這個鏡頭沒有配音（畫面仍會照常生成）。
 */
export class ElevenLabsVoiceProvider implements VoiceProvider {
  async synthesize(text: string, outputPath: string, voiceId?: string): Promise<boolean> {
    if (!env.elevenLabsApiKey) {
      return false;
    }
    const voice = voiceId ?? env.elevenLabsVoiceId;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        "xi-api-key": env.elevenLabsApiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`ElevenLabs 配音失敗（${res.status}）：${errText.slice(0, 500)}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(outputPath, buffer);
    return true;
  }
}

export function createVoiceProvider(mock: boolean): VoiceProvider {
  return mock ? new MockVoiceProvider() : new ElevenLabsVoiceProvider();
}
