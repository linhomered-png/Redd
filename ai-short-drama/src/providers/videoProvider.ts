import { writeFile } from "node:fs/promises";
import { env, requireEnv } from "../config.js";
import { logger } from "../logger.js";
import type { Shot } from "../types.js";
import { generateKenBurnsClip, generateTestClip } from "../lib/ffmpeg.js";
import { PollinationsImageProvider, type ImageProvider } from "./imageProvider.js";

export const VIDEO_PROVIDER_NAMES = ["kenburns", "runway", "seedance"] as const;
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

interface FalQueueSubmitResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
}

interface FalQueueStatusResponse {
  status?: string;
}

interface SeedanceResult {
  video?: { url?: string };
}

/**
 * 使用 ByteDance Seedance 2.0（透過 fal.ai 存取）的文生視頻 API，依 visualPrompt
 * 直接生成一段動態影片片段（不像 Runway 需要先產生關鍵幀圖片再轉視頻）。
 *
 * fal.ai 帳號：https://fal.ai ，金鑰設定在 FAL_KEY。
 *
 * ⚠️ 這段是照 fal.ai 公開文件／範例（模型 id、queue 端點、request/response 欄位）
 * 實作的，本機環境沒辦法連到 fal.ai 做端對端驗證。若遇到 404 或欄位相關的錯誤，
 * 請對照 https://fal.ai/models/bytedance/seedance-2.0 與 https://docs.fal.ai/model-apis/queue
 * 確認目前的端點路徑與請求格式，並更新 .env 裡的 SEEDANCE_* 設定或本檔案。
 */
export class SeedanceVideoProvider implements VideoProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = requireEnv(
      env.falApiKey,
      "FAL_KEY",
      "請至 https://fal.ai 建立金鑰，或改用 --mock 測試流程。",
    );
    this.baseUrl = env.falApiBaseUrl.replace(/\/+$/, "");
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Key ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /** Seedance 2.0 的 duration 欄位以秒為單位；夾在 4~12 秒之間，跟劇本鏡頭長度的規則一致。 */
  private normalizeDuration(durationSeconds: number): number {
    return Math.min(12, Math.max(4, Math.round(durationSeconds)));
  }

  async generateClip(shot: Shot, outputPath: string, _shotIndex: number): Promise<void> {
    logger.info(`[鏡頭 ${shot.shotNumber}] Seedance 2.0 文生視頻中（fal.ai）…`);

    const submitRes = await fetch(`${this.baseUrl}/${env.seedanceModel}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        prompt: `${shot.visualPrompt}, camera: ${shot.cameraMovement}`,
        duration: String(this.normalizeDuration(shot.durationSeconds)),
        resolution: env.seedanceResolution,
        aspect_ratio: "9:16",
        generate_audio: false,
        seed: shot.shotNumber,
      }),
    });
    if (!submitRes.ok) {
      const text = await submitRes.text().catch(() => "");
      throw new Error(`fal.ai（Seedance）建立任務失敗（${submitRes.status}）：${text.slice(0, 500)}`);
    }
    const submitJson = (await submitRes.json()) as FalQueueSubmitResponse;
    if (!submitJson.status_url || !submitJson.response_url) {
      throw new Error(
        `fal.ai（Seedance）回應沒有 status_url／response_url：${JSON.stringify(submitJson).slice(0, 500)}`,
      );
    }

    await this.pollUntilComplete(submitJson.status_url, `鏡頭 ${shot.shotNumber}`);

    const resultRes = await fetch(submitJson.response_url, { headers: this.headers() });
    if (!resultRes.ok) {
      const text = await resultRes.text().catch(() => "");
      throw new Error(`fal.ai（Seedance）任務失敗（${resultRes.status}）：${text.slice(0, 500)}`);
    }
    const result = (await resultRes.json()) as SeedanceResult;
    const videoUrl = result.video?.url;
    if (!videoUrl) {
      throw new Error(`fal.ai（Seedance）回應沒有 video.url：${JSON.stringify(result).slice(0, 500)}`);
    }

    await this.downloadTo(videoUrl, outputPath);
    logger.success(`[鏡頭 ${shot.shotNumber}] 影片片段完成（Seedance 2.0）→ ${outputPath}`);
  }

  private async pollUntilComplete(statusUrl: string, label: string): Promise<void> {
    const pollIntervalMs = 4000;
    const maxAttempts = 90; // 最多等 6 分鐘
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const res = await fetch(statusUrl, { headers: this.headers() });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`fal.ai（Seedance）查詢任務狀態失敗（${res.status}）：${text.slice(0, 500)}`);
      }
      const json = (await res.json()) as FalQueueStatusResponse;
      if (json.status === "COMPLETED") {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    throw new Error(`fal.ai（Seedance）任務逾時（${label}），請稍後重試`);
  }

  private async downloadTo(url: string, destPath: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`下載 Seedance 產出檔案失敗（${res.status}）：${url}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(destPath, buffer);
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
    case "seedance":
      return new SeedanceVideoProvider();
  }
}
