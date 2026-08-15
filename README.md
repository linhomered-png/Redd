# 照片轉影片

將多張照片拼接成一個 MP4 影片，完全在瀏覽器本地完成（基於 [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)，無需上傳照片到伺服器）。

## 功能

- 拖曳或選擇上傳多張照片
- 拖曳調整照片順序，逐張或批量設定停留時長
- 轉場效果：無轉場 / 淡入淡出
- 可選背景音樂（自動循環以符合影片長度）
- 可選解析度（720p / 1080p / 直式 / 方形）與畫格率
- 生成後直接預覽並下載 MP4

## 開發

```bash
npm install
npm run dev
```

`predev` / `prebuild` 會自動將 `@ffmpeg/core` 的 wasm 引擎檔案複製到 `public/ffmpeg-core`（該目錄已加入 `.gitignore`，不會提交到儲存庫），使應用無需依賴任何第三方 CDN。

```bash
npm run build
```

## 技術棧

React + TypeScript + Vite，影片合成使用 `@ffmpeg/ffmpeg` / `@ffmpeg/core`（ffmpeg 編譯到 WebAssembly，運行在瀏覽器 Worker 中）。
