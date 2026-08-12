import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { env } from "../config.js";
import { generateSilentAudio } from "../lib/ffmpeg.js";
import { describeFreeServiceFailure } from "../lib/networkError.js";

export const VOICE_PROVIDER_NAMES = ["edge", "elevenlabs"] as const;
export type VoiceProviderName = (typeof VOICE_PROVIDER_NAMES)[number];

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
 * 完全免費的配音方式：借用 Microsoft Edge 瀏覽器內建的線上朗讀（Read Aloud）引擎，
 * 不需要任何金鑰。這是社群反向工程出來的用法（`msedge-tts` 套件），不是微軟正式對外
 * 開放的公開 API，音質是真人神經網路語音，跟 Azure 官方 TTS 是同一套引擎。
 *
 * ⚠️ 因為是非官方用法，某些網路環境（尤其是雲端主機／資料中心 IP）可能會被
 * 微軟的伺服器擋掉（連線失敗或 403）。若你的環境剛好被擋，請改用
 * --voice-provider elevenlabs，或用 --mock 測試流程。
 */
export class EdgeTtsVoiceProvider implements VoiceProvider {
  async synthesize(text: string, outputPath: string, voiceId?: string): Promise<boolean> {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voiceId ?? env.edgeTtsVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text);
      await pipeline(audioStream, createWriteStream(outputPath));
      return true;
    } catch (error) {
      throw new Error(
        describeFreeServiceFailure({
          serviceName: "edge-tts 免費配音",
          error,
          fallbackHint:
            "可以改用 --voice-provider elevenlabs（需要 ELEVENLABS_API_KEY），或先用 --mock 測試其餘流程是否正常。",
        }),
      );
    } finally {
      tts.close();
    }
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

export function createVoiceProvider(mock: boolean, provider: VoiceProviderName): VoiceProvider {
  if (mock) {
    return new MockVoiceProvider();
  }
  switch (provider) {
    case "edge":
      return new EdgeTtsVoiceProvider();
    case "elevenlabs":
      return new ElevenLabsVoiceProvider();
  }
}
