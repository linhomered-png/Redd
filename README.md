# 照片转视频

将多张照片拼接成一个 MP4 视频，完全在浏览器本地完成（基于 [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)，无需上传照片到服务器）。

## 功能

- 拖拽或选择上传多张照片
- 拖拽调整照片顺序，逐张或批量设置停留时长
- 转场效果：无转场 / 淡入淡出
- 可选背景音乐（自动循环以匹配视频长度）
- 可选分辨率（720p / 1080p / 竖屏 / 方形）与帧率
- 生成后直接预览并下载 MP4

## 开发

```bash
npm install
npm run dev
```

`predev` / `prebuild` 会自动将 `@ffmpeg/core` 的 wasm 引擎文件复制到 `public/ffmpeg-core`（该目录已加入 `.gitignore`，不会提交到仓库），使应用无需依赖任何第三方 CDN。

```bash
npm run build
```

## 技术栈

React + TypeScript + Vite，视频合成使用 `@ffmpeg/ffmpeg` / `@ffmpeg/core`（ffmpeg 编译到 WebAssembly，运行在浏览器 Worker 中）。
