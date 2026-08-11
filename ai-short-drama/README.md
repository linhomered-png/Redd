# AI 短劇自動化工作流

一個命令列工具：輸入一個主題，自動跑完「**劇本 → 分鏡 → AI 生成影片片段／配音／字幕 → ffmpeg 合成成品**」整條流程，最後在 `output/` 目錄產出每一集的 MP4 成品。

```
主題 → Claude 生成劇本＋分鏡腳本(JSON)
     → 每個鏡頭：Runway 生成關鍵幀圖片 → 圖生視頻
     → 每個鏡頭：ElevenLabs 生成配音（若有台詞／旁白）
     → ffmpeg：統一解析度／長度 → 串接 → 混音（可選 BGM）→ 燒字幕
     → output/<劇名>/epNN.mp4
```

## 安裝

```bash
cd ai-short-drama
npm install
cp .env.example .env
# 編輯 .env，填入下面「需要的金鑰」
```

不需要另外安裝 ffmpeg — `ffmpeg-static` / `ffprobe-static` 會自動附帶對應平台的執行檔。

## 需要的金鑰

| 服務 | 用途 | 沒有金鑰會怎樣 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 用 Claude 生成劇本與分鏡腳本 | 必要（除非用 `--mock`） |
| `RUNWAY_API_KEY` | 用 Runway ML 生成每個鏡頭的 AI 影片片段 | 必要（除非用 `--mock`） |
| `ELEVENLABS_API_KEY` | 生成配音 | 選填 — 沒設定的話該鏡頭就沒有配音，畫面照常生成 |

> ⚠️ Runway 的 API 端點／欄位名稱可能隨版本更新而調整。若執行時出現 404 或欄位錯誤，
> 請對照 [Runway 官方 API 文件](https://docs.dev.runwayml.com) 確認目前的路徑與參數，
> 更新 `.env` 裡的 `RUNWAY_*` 設定，或視需要調整 `src/providers/videoProvider.ts`。
> 想串接 Luma / 可靈 / 即夢 等其他服務，只要實作 `VideoProvider` 介面（`generateClip`）即可替換。

## 先跑一次 `--mock`，確認環境沒問題

在填金鑰之前，可以先用 `--mock` 跑一次完整流程 —— 全程不呼叫任何外部 AI 服務，
劇本用假資料產生，影片片段用 ffmpeg 產生純色卡＋文字的測試片段，配音用靜音音檔代替。
這能驗證 Node、ffmpeg、字幕燒錄等環節都正常運作。

```bash
npm run generate -- --topic "重生復仇" --mock
```

## 正式使用

```bash
npm run generate -- \
  --topic "霸總错爱：我的替身新娘" \
  --genre "霸總甜寵" \
  --episodes 3 \
  --shots-per-episode 10 \
  --language "繁體中文" \
  --bgm ./assets/bgm.mp3
```

執行完成後，`output/<劇名>/` 底下會有：

- `script.json` — Claude 生成的完整劇本與分鏡腳本（可以手動編輯後重跑後續步驟）
- `epNN.mp4` — 第 N 集成品影片（含字幕、配音、可選 BGM）
- `epNN_work/` — 中間檔案（各鏡頭原始片段、正規化片段、SRT 字幕），方便除錯

## CLI 參數

| 參數 | 說明 | 預設值 |
| --- | --- | --- |
| `-t, --topic <topic>` | 短劇主題／題材（必填） | — |
| `-g, --genre <genre>` | 類型標籤 | 都市情感／反轉 |
| `-e, --episodes <n>` | 集數 | 1 |
| `-s, --shots-per-episode <n>` | 每集大約鏡頭數 | 8 |
| `-l, --language <language>` | 台詞／旁白語言 | 繁體中文 |
| `-o, --output <dir>` | 輸出目錄 | ./output |
| `--bgm <path>` | 背景音樂檔案路徑 | 無 |
| `--voice-id <id>` | ElevenLabs 語音 ID | 用 `.env` 裡的 `ELEVENLABS_VOICE_ID` |
| `--script-max-tokens <n>` | 劇本生成的 max_tokens 上限 | 16000 |
| `--mock` | 不呼叫任何外部 AI 服務，全程用假資料測試 | false |

如果劇本因為集數／鏡頭數太多而被截斷（錯誤訊息會提到 `parsed_output`），
請減少 `--episodes` × `--shots-per-episode`，或調高 `--script-max-tokens`。

## 架構

```
src/
  cli.ts                — CLI 進入點（commander）
  config.ts              — 讀取 .env
  types.ts / schema.ts   — 劇本／鏡頭的型別與 zod schema（給 Claude structured output 用）
  pipeline/
    generateScript.ts    — 呼叫 Claude 生成劇本（structured output）
    mockScript.ts         — --mock 用的假劇本
    produceShots.ts       — 逐鏡頭呼叫影片／配音 provider
    assembleVideo.ts      — ffmpeg：正規化、串接、混音、燒字幕
    buildSubtitles.ts     — 產生 SRT 字幕
    runPipeline.ts         — 串起以上所有步驟
  providers/
    videoProvider.ts      — VideoProvider 介面 + Runway 實作 + Mock 實作
    voiceProvider.ts      — VoiceProvider 介面 + ElevenLabs 實作 + Mock 實作
  lib/ffmpeg.ts           — ffmpeg / ffprobe 的薄封裝
```

想要串接其他 AI 影片／配音服務，只要各自實作 `VideoProvider` / `VoiceProvider`
兩個介面（一個方法而已），在 `runPipeline.ts` 換掉 `createVideoProvider` /
`createVoiceProvider` 的實作即可，不需要動到劇本生成或 ffmpeg 合成的邏輯。

## 開發

```bash
npm run generate -- --topic "..." --mock   # 直接用 tsx 執行，免編譯
npm run build                               # tsc -b，輸出到 dist/
npm run lint                                # oxlint
```
