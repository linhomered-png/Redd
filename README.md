# 照片转视频

将多张照片拼接成一个 MP4 视频，完全在浏览器本地完成（基于 [ffmpeg.wasm](https://ffmpegwasm.netlify.app/)，无需上传照片到服务器）。

## 功能

### 图文转视频（基本模式）

- 拖拽或选择上传多张照片
- 拖拽调整照片顺序，逐张或批量设置停留时长
- 转场效果：无转场 / 淡入淡出
- 可选背景音乐（自动循环以匹配视频长度）
- 可选分辨率（720p / 1080p / 竖屏 / 方形）与帧率
- 生成后直接预览并下载 MP4

### 逐字稿旁白视频（进阶模式）

贴上一段逐字稿，自动：

1. 按标点断句，逐句用浏览器内置的语音合成（Web Speech API）朗读
2. 录制朗读时的标签页音频作为旁白配音
3. 依朗读时间轴，把逐字稿逐字叠加在背景照片上，做出逐字弹出的字幕动画
4. 与图文转视频共用同一套引擎，一键输出带旁白与字幕的 MP4

> 录制旁白使用 `getDisplayMedia` 抓取标签页音频，这是浏览器目前唯一能把
> `speechSynthesis` 语音输出录成音频文件的办法，因此只支持桌面版 Chrome /
> Edge，且需要在弹出窗口中选择「此标签页」并勾选「分享标签页音频」。不支持的
> 浏览器会在页面上直接提示。

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
