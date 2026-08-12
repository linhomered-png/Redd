# AI 短劇自動化工作流

一個命令列工具：輸入一個主題，自動跑完「**劇本 → 分鏡 → AI 生成影片片段／配音／字幕 → ffmpeg 合成成品**」整條流程，最後在 `output/` 目錄產出每一集的 MP4 成品。

```
主題 → Claude 生成劇本＋分鏡腳本(JSON)
     → 每個鏡頭：生成關鍵幀圖片 → 轉成動態片段
     → 每個鏡頭：生成配音（若有台詞／旁白）
     → ffmpeg：統一解析度／長度 → 串接 → 混音（可選 BGM）→ 燒字幕
     → output/<劇名>/epNN.mp4
```

## 費用：預設幾乎全免費

| 環節 | 預設方式 | 費用 |
| --- | --- | --- |
| 劇本生成 | Claude API | **唯一要付費的環節**，但用量很小（一次幾分錢美金等級），沒有長期免費額度 |
| 影片片段 | `--video-provider kenburns`（預設）：免費文生圖（Pollinations.ai）＋ ffmpeg Ken Burns 動態效果 | **免費**，不需金鑰 |
| 配音 | `--voice-provider edge`（預設）：借用 Microsoft Edge 線上朗讀引擎（`edge-tts`） | **免費**，不需金鑰 |

也可以切換成付費、畫質／音質更好的方案：
- `--video-provider runway`（Runway ML 圖生視頻）
- `--video-provider seedance`（ByteDance Seedance 2.0，透過 [fal.ai](https://fal.ai) 存取，文生視頻，不需要先產生關鍵幀圖片）
- `--voice-provider elevenlabs`（ElevenLabs TTS）

> ⚠️ 免費的兩個服務（Pollinations、edge-tts）都是公開、不需認證的第三方服務，
> 不是正式簽約的付費 API，穩定性與畫質／音質沒有保證，而且**某些網路環境（尤其是
> 雲端主機／CI／資料中心）可能會被暫時擋掉**。如果你在雲端環境跑這個工具卻連不上，
> 換成一般家用／公司網路通常就會通；連不上時可以先用 `--mock` 驗證其餘流程沒問題，
> 或直接切換成付費 provider。

## 安裝

```bash
cd ai-short-drama
npm install
cp .env.example .env
# 只要填 ANTHROPIC_API_KEY 就能用免費預設方案跑完整條流程
```

不需要另外安裝 ffmpeg — `ffmpeg-static` / `ffprobe-static` 會自動附帶對應平台的執行檔。

## 需要的金鑰

| 服務 | 用途 | 是否必要 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 用 Claude 生成劇本與分鏡腳本 | 必要（除非用 `--mock`） |
| `RUNWAY_API_KEY` | 只有用 `--video-provider runway` 時才需要 | 選填 |
| `FAL_KEY` | 只有用 `--video-provider seedance` 時才需要（[fal.ai](https://fal.ai) 的金鑰） | 選填 |
| `ELEVENLABS_API_KEY` | 只有用 `--voice-provider elevenlabs` 時才需要 | 選填 |

## 先跑一次 `--mock`，確認環境沒問題

在填金鑰之前，可以先用 `--mock` 跑一次完整流程 —— 全程不呼叫任何外部服務，
劇本用假資料產生，影片片段用 ffmpeg 產生純色卡＋文字的測試片段，配音用靜音音檔代替。
這能驗證 Node、ffmpeg、字幕燒錄等環節都正常運作，跟網路或金鑰無關。

```bash
npm run generate -- --topic "重生復仇" --mock
```

## 正式使用（免費預設方案）

```bash
npm run generate -- \
  --topic "霸總错爱：我的替身新娘" \
  --genre "霸總甜寵" \
  --episodes 3 \
  --shots-per-episode 10 \
  --language "繁體中文" \
  --bgm ./assets/bgm.mp3
```

只需要 `.env` 裡的 `ANTHROPIC_API_KEY`，其餘全部免費。想換成付費、品質更好的影片／配音服務：

```bash
npm run generate -- --topic "..." --video-provider seedance --voice-provider elevenlabs
```

> Seedance 2.0 是透過 [fal.ai](https://fal.ai) 存取的（`FAL_KEY`），不是官方火山引擎／火山方舟。
> 如果你已經有火山引擎的帳號想直接接官方 API，那是不同的認證方式（AK/SK 簽名），
> 需要另外改 `src/providers/videoProvider.ts`，跟這裡預設接的 fal.ai 不是同一套。

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
| `--voice-id <id>` | 配音的語音 ID／voice name | 用 `.env` 裡對應 provider 的設定 |
| `--script-max-tokens <n>` | 劇本生成的 max_tokens 上限 | 16000 |
| `--video-provider <name>` | `kenburns`（免費）／`runway`（付費）／`seedance`（付費，Seedance 2.0） | kenburns |
| `--voice-provider <name>` | `edge`（免費）或 `elevenlabs`（付費） | edge |
| `--mock` | 不呼叫任何外部服務，全程用假資料測試 | false |

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
    videoProvider.ts      — VideoProvider 介面：KenBurns（免費）／Runway（付費）／Seedance 2.0（付費，透過 fal.ai）／Mock
    imageProvider.ts      — ImageProvider 介面：Pollinations（免費，KenBurns 用）
    voiceProvider.ts      — VoiceProvider 介面：edge-tts（免費）／ElevenLabs（付費）／Mock
  lib/ffmpeg.ts           — ffmpeg / ffprobe 的薄封裝（含 Ken Burns zoompan 效果）
```

想要串接其他 AI 影片／生圖／配音服務，只要各自實作 `VideoProvider` / `ImageProvider` /
`VoiceProvider` 介面（一個方法而已），在 `runPipeline.ts` 換掉對應的 `create*Provider`
實作即可，不需要動到劇本生成或 ffmpeg 合成的邏輯。

## 開發

```bash
npm run generate -- --topic "..." --mock   # 直接用 tsx 執行，免編譯
npm run build                               # tsc -b，輸出到 dist/
npm run lint                                # oxlint
```
