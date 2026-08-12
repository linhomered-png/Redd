import { writeFile } from "node:fs/promises";
import { env, requireEnv } from "../config.js";
import { logger } from "../logger.js";
import type { Shot } from "../types.js";
import { generateKenBurnsClip, generateTestClip } from "../lib/ffmpeg.js";
import { PollinationsImageProvider, type ImageProvider } from "./imageProvider.js";

export const VIDEO_PROVIDER_NAMES = ["kenburns", "runway"] as const;
export type VideoProviderName = (typeof VIDEO_PROVIDER_NAMES)[number];

export interface VideoProvider {
  /** 為單一鏡頭生成一段影片片段，寫到 outputPath（mp4）。 */
  generateClip(shot: Shot, outputPath: string, shotIndex: number): Promise<void>;
}

/**
 * Mock 影片產生器：不呼叫任何外部 API，改用 ffmpeg 產生純色卡＋文字的測試片段。
 * 用來在沒有 AI 影片生成服務金鑰時，驗證「劇本 → 片段 → 配音 → 合成」整條流程是否接得起來。
 */
export class MockVideoProvider implements VideoProvider {
  async generateClip(shot: Shot, outputPath: string, shotIndex: number): Promise<void> {
    await generateTestClip({
      outputPath,
      durationSeconds: shot.durationSeconds,
      label: `[MOCK] Shot ${shot.shotNumber}`,
      width: 1080,
      height: 1920,
      fps: 30,
      colorIndex: shotIndex,
    });
  }
}

/**
 * 完全免費的影片生成方式：用免費文生圖 API（預設 Pollinations.ai）依 visualPrompt
 * 生成一張關鍵幀圖片，再用 ffmpeg 的 Ken Burns 效果（緩慢縮放／平移）把靜態圖片變成
 * 動態片段。不需要任何影片生成服務的金鑰。
 *
 * 畫質與動態效果自然比不上真正的 AI 影片生成模型（Runway／可靈／即夢等），
 * 但完全免費，適合先把整條流程跑起來，之後想升級畫質再切換 --video-provider runway。
 */
export class KenBurnsVideoProvider implements VideoProvider {
  private readonly imageProvider: ImageProvider;

  constructor(imageProvider: ImageProvider = new PollinationsImageProvider()) {
    this.imageProvider = imageProvider;
  }

  async generateClip(shot: Shot, outputPath: string, shotIndex: number): Promise<void> {
    logger.info(`[鏡頭 ${shot.shotNumber}] 免費生圖中（Pollinations.ai）…`);
    const imagePath = `${outputPath}.keyframe.png`;
    await this.imageProvider.generateImage(shot.visualPrompt, imagePath, shot.shotNumber);

    logger.info(`[鏡頭 ${shot.shotNumber}] 套用 Ken Burns 動態效果…`);
    await generateKenBurnsClip({
      imagePath,
      outputPath,
      durationSeconds: shot.durationSeconds,
      width: env.imageWidth,
      height: env.imageHeight,
      fps: 30,
      // 交替使用放大／縮小，讓連續鏡頭的動態效果不會一成不變
      zoomIn: shotIndex % 2 === 0,
    });
    logger.success(`[鏡頭 ${shot.shotNumber}] 影片片段完成（免費：生圖＋Ken Burns）→ ${outputPath}`);
  }
}

interface RunwayTask {
  id: string;
  status: "PENDING" | "THROTTLED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  output?: string[];
  failure?: string;
}

/**
 * 使用 Runway ML 的圖生視頻 API：
 *   1) 先用 text_to_image 依 visualPrompt 生成一張關鍵幀圖片
 *   2) 再用 image_to_video 把這張圖片轉成動態片段
 *
 * ⚠️ 第三方 API 會隨版本更新調整端點與欄位名稱。若遇到 404 或欄位相關的錯誤，
 * 請對照 Runway 官方文件（https://docs.dev.runwayml.com）確認目前的端點路徑、
 * model 名稱與請求格式，並更新 .env 裡的 RUNWAY_* 設定或本檔案。
 */
export class RunwayVideoProvider implements VideoProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly version: string;

  constructor() {
    this.apiKey = requireEnv(
      env.runwayApiKey,
      "RUNWAY_API_KEY",
      "請至 https://dev.runwayml.com 建立金鑰，或改用 --mock 測試流程。",
    );
    this.baseUrl = env.runwayApiBaseUrl.replace(/\/+$/, "");
    this.version = env.runwayApiVersion;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "X-Runway-Version": this.version,
      "Content-Type": "application/json",
    };
  }

  private async createTask(path: string, body: Record<string, unknown>): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Runway API 建立任務失敗（${res.status} ${path}）：${text.slice(0, 500)}`);
    }
    const json = (await res.json()) as { id?: string };
    if (!json.id) {
      throw new Error(`Runway API 回應沒有任務 id（${path}）：${JSON.stringify(json).slice(0, 500)}`);
    }
    return json.id;
  }

  private async pollTask(taskId: string, label: string): Promise<string> {
    const pollIntervalMs = 4000;
    const maxAttempts = 90; // 最多等 6 分鐘
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch(`${this.baseUrl}/v1/tasks/${taskId}`, {
        headers: this.headers(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Runway API 查詢任務狀態失敗（${res.status}）：${text.slice(0, 500)}`);
      }
      const task = (await res.json()) as RunwayTask;
      if (task.status === "SUCCEEDED") {
        const output = task.output?.[0];
        if (!output) {
          throw new Error(`Runway 任務 ${taskId} 成功但沒有回傳 output（${label}）`);
        }
        return output;
      }
      if (task.status === "FAILED") {
        throw new Error(`Runway 任務 ${taskId} 失敗（${label}）：${task.failure ?? "未知錯誤"}`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(`Runway 任務 ${taskId} 逾時（${label}），請稍後重試`);
  }

  private async downloadTo(url: string, destPath: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`下載 Runway 產出檔案失敗（${res.status}）：${url}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buffer);
  }

  /** 依片段時長挑選 Runway 支援的檔位（多數模型只支援 5 秒或 10 秒）。 */
  private normalizeDuration(durationSeconds: number): 5 | 10 {
    return durationSeconds <= 7 ? 5 : 10;
  }

  async generateClip(shot: Shot, outputPath: string, _shotIndex: number): Promise<void> {
    logger.info(`[鏡頭 ${shot.shotNumber}] 生成關鍵幀圖片…`);
    const imageTaskId = await this.createTask("/v1/text_to_image", {
      model: env.runwayImageModel,
      promptText: shot.visualPrompt,
      ratio: "1080:1920",
    });
    const imageUrl = await this.pollTask(imageTaskId, `鏡頭 ${shot.shotNumber} 關鍵幀`);

    logger.info(`[鏡頭 ${shot.shotNumber}] 圖生視頻中…`);
    const duration = this.normalizeDuration(shot.durationSeconds);
    const videoTaskId = await this.createTask("/v1/image_to_video", {
      model: env.runwayVideoModel,
      promptImage: imageUrl,
      promptText: `${shot.visualPrompt}, camera: ${shot.cameraMovement}`,
      ratio: "1080:1920",
      duration,
    });
    const videoUrl = await this.pollTask(videoTaskId, `鏡頭 ${shot.shotNumber} 影片`);

    await this.downloadTo(videoUrl, outputPath);
    logger.success(`[鏡頭 ${shot.shotNumber}] 影片片段完成 → ${outputPath}`);
  }
}

export function createVideoProvider(mock: boolean, provider: VideoProviderName): VideoProvider {
  if (mock) {
    return new MockVideoProvider();
  }
  switch (provider) {
    case "kenburns":
      return new KenBurnsVideoProvider();
    case "runway":
      return new RunwayVideoProvider();
  }
}
