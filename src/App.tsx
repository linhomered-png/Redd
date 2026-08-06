import { useCallback, useState } from "react";
import "./App.css";
import { PhotoUploader } from "./components/PhotoUploader";
import { PhotoList } from "./components/PhotoList";
import { BackgroundList } from "./components/BackgroundList";
import { SettingsPanel } from "./components/SettingsPanel";
import { ScriptPanel } from "./components/ScriptPanel";
import { VideoResult } from "./components/VideoResult";
import type { MediaItem, NarrationResult, VideoSettings } from "./types";
import { loadFfmpeg } from "./utils/ffmpegClient";
import { buildVideo } from "./utils/buildVideo";
import type { BuildProgress } from "./utils/buildVideo";
import { readVideoDuration } from "./utils/videoMeta";
import { buildCaptionFrameItems } from "./utils/captionFrames";

type Mode = "classic" | "narrated";

const DEFAULT_SETTINGS: VideoSettings = {
  transition: "fade",
  transitionDuration: 0.6,
  resolution: { width: 1280, height: 720 },
  fps: 30,
  musicFile: null,
  narrationFile: null,
};

const MAX_VIDEO_CLIP_DURATION = 8;

let nextId = 0;

function App() {
  const [mode, setMode] = useState<Mode>("classic");

  // Classic "photos → video" mode.
  const [items, setItems] = useState<MediaItem[]>([]);

  // Narrated-script mode.
  const [backgroundItems, setBackgroundItems] = useState<MediaItem[]>([]);
  const [scriptText, setScriptText] = useState("");
  const [narration, setNarration] = useState<NarrationResult | null>(null);

  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "loading-ffmpeg" | "building" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState<BuildProgress>({ stage: "preparing", ratio: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const addFiles = useCallback((files: File[]) => {
    const newItems: MediaItem[] = files.map((file) => ({
      id: `m${nextId++}`,
      file,
      kind: file.type.startsWith("video/") ? "video" : "image",
      url: URL.createObjectURL(file),
      duration: 3,
      sourceDuration: null,
    }));
    setItems((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      if (item.kind !== "video") continue;
      readVideoDuration(item.file)
        .then((duration) => {
          const clamped = Math.min(duration, MAX_VIDEO_CLIP_DURATION);
          setItems((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, duration: clamped, sourceDuration: duration } : p,
            ),
          );
        })
        .catch((err) => console.error(err));
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updateDuration = useCallback((id: string, duration: number) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, duration } : p)));
  }, []);

  const applyDurationToAll = useCallback((duration: number) => {
    setItems((prev) =>
      prev.map((p) => ({
        ...p,
        duration: p.sourceDuration ? Math.min(duration, p.sourceDuration) : duration,
      })),
    );
  }, []);

  const addBackgroundFiles = useCallback((files: File[]) => {
    const newItems: MediaItem[] = files.map((file) => ({
      id: `b${nextId++}`,
      file,
      kind: "image",
      url: URL.createObjectURL(file),
      duration: 3,
      sourceDuration: null,
    }));
    setBackgroundItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeBackgroundItem = useCallback((id: string) => {
    setBackgroundItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  async function handleGenerateClassic() {
    if (items.length === 0) return;
    setErrorMessage("");
    try {
      setStatus("loading-ffmpeg");
      const ffmpeg = await loadFfmpeg((message) => console.log("[ffmpeg]", message));

      setStatus("building");
      setProgress({ stage: "preparing", ratio: 0 });
      const blob = await buildVideo(ffmpeg, items, settings, setProgress);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  async function handleGenerateNarrated() {
    if (!narration || backgroundItems.length === 0) return;
    setErrorMessage("");
    try {
      setStatus("building");
      setProgress({ stage: "preparing", ratio: 0 });
      const frames = await buildCaptionFrameItems(
        { sentences: narration.sentences, backgrounds: backgroundItems, resolution: settings.resolution },
        () => `f${nextId++}`,
      );

      setStatus("loading-ffmpeg");
      const ffmpeg = await loadFfmpeg((message) => console.log("[ffmpeg]", message));

      setStatus("building");
      setProgress({ stage: "preparing", ratio: 0 });
      const narratedSettings: VideoSettings = {
        ...settings,
        transition: "none",
        narrationFile: narration.audioFile,
      };
      const blob = await buildVideo(ffmpeg, frames, narratedSettings, setProgress);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  function handleDiscard() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setStatus("idle");
  }

  const isBusy = status === "loading-ffmpeg" || status === "building";

  return (
    <div className="app">
      <header>
        <h1>照片轉影片</h1>
        <p className="subtitle">
          {mode === "classic"
            ? "上傳照片與影片片段，設定時長與轉場，一鍵生成影片 — 全部在瀏覽器本地完成"
            : "貼上逐字稿，自動生成旁白配音與逐字彈出字幕影片 — 全部在瀏覽器本地完成"}
        </p>
      </header>

      {status !== "done" && (
        <div className="mode-switch" role="tablist">
          <button
            type="button"
            className={`mode-btn${mode === "classic" ? " active" : ""}`}
            onClick={() => setMode("classic")}
            disabled={isBusy}
          >
            圖文轉影片
          </button>
          <button
            type="button"
            className={`mode-btn${mode === "narrated" ? " active" : ""}`}
            onClick={() => setMode("narrated")}
            disabled={isBusy}
          >
            逐字稿旁白影片
          </button>
        </div>
      )}

      {status === "done" && videoUrl ? (
        <VideoResult videoUrl={videoUrl} onDiscard={handleDiscard} />
      ) : mode === "classic" ? (
        <>
          <PhotoUploader onFilesAdded={addFiles} />

          <PhotoList
            items={items}
            onReorder={setItems}
            onRemove={removeItem}
            onDurationChange={updateDuration}
          />

          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onApplyDurationToAll={applyDurationToAll}
          />

          <div className="generate-bar">
            <button
              type="button"
              className="primary-btn"
              disabled={items.length === 0 || isBusy}
              onClick={handleGenerateClassic}
            >
              {isBusy ? "生成中…" : "生成影片"}
            </button>

            {isBusy && <ProgressBar status={status} progress={progress} />}
            {status === "error" && <p className="error-msg">生成失敗：{errorMessage}</p>}
          </div>
        </>
      ) : (
        <>
          <ScriptPanel
            scriptText={scriptText}
            onScriptChange={setScriptText}
            narration={narration}
            onNarrationChange={setNarration}
          />

          <h2 className="section-title">背景照片</h2>
          <PhotoUploader onFilesAdded={addBackgroundFiles} acceptVideos={false} />
          <BackgroundList items={backgroundItems} onRemove={removeBackgroundItem} />

          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            onApplyDurationToAll={() => {}}
            hideTransition
          />

          <div className="generate-bar">
            <button
              type="button"
              className="primary-btn"
              disabled={!narration || backgroundItems.length === 0 || isBusy}
              onClick={handleGenerateNarrated}
            >
              {isBusy ? "生成中…" : "使用旁白生成影片"}
            </button>
            {!narration && (
              <p className="settings-hint">請先在上方產生旁白錄音，再上傳背景照片</p>
            )}

            {isBusy && <ProgressBar status={status} progress={progress} />}
            {status === "error" && <p className="error-msg">生成失敗：{errorMessage}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function ProgressBar({
  status,
  progress,
}: {
  status: "loading-ffmpeg" | "building";
  progress: BuildProgress;
}) {
  return (
    <div className="progress">
      <div className="progress-label">
        {status === "loading-ffmpeg"
          ? "正在載入影片引擎…"
          : progress.stage === "preparing"
            ? "正在處理素材…"
            : "正在合成影片…"}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
      </div>
    </div>
  );
}

export default App;
