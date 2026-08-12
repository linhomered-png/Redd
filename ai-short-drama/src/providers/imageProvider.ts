import { writeFile } from "node:fs/promises";
import { env } from "../config.js";
import { describeFreeServiceFailure } from "../lib/networkError.js";

export interface ImageProvider {
  /** 依提示詞生成一張圖片，寫到 outputPath。seed 用來讓同一個鏡頭多次執行時盡量得到一致的圖。 */
  generateImage(prompt: string, outputPath: string, seed: number): Promise<void>;
}

const FALLBACK_HINT =
  "可以改用 --video-provider runway（需要 RUNWAY_API_KEY），或先用 --mock 測試其餘流程是否正常。";

/**
 * 使用 Pollinations.ai 的免費文生圖 API —— 不需要金鑰、沒有官方用量限制。
 * 這是公開、無需認證的服務，性質上比較像社群共享的免費資源，穩定性與畫質都不保證
 * 跟付費服務（Midjourney、DALL·E、即夢等）同等級，但拿來產生短劇關鍵幀圖片、
 * 搭配 Ken Burns 動態效果，已經堪用且完全免費。
 *
 * ⚠️ 這是免費第三方服務，API 形狀可能沒有正式文件保證、也可能說變就變，而且常常在
 * 雲端主機／公司網路等環境被擋掉。若請求持續失敗，請確認 https://pollinations.ai
 * 目前的用法，或改用 --video-provider runway。
 */
export class PollinationsImageProvider implements ImageProvider {
  async generateImage(prompt: string, outputPath: string, seed: number): Promise<void> {
    const params = new URLSearchParams({
      width: String(env.imageWidth),
      height: String(env.imageHeight),
      seed: String(seed),
      nologo: "true",
      model: env.pollinationsModel,
    });
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (error) {
      throw new Error(
        describeFreeServiceFailure({ serviceName: "Pollinations 免費生圖", error, fallbackHint: FALLBACK_HINT }),
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        describeFreeServiceFailure({
          serviceName: "Pollinations 免費生圖",
          error: new Error(text.slice(0, 300) || res.statusText),
          httpStatus: res.status,
          fallbackHint: FALLBACK_HINT,
        }),
      );
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(outputPath, buffer);
  }
}
