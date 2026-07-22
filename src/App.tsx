import { useCallback, useState } from "react";
import "./App.css";
import { PhotoUploader } from "./components/PhotoUploader";
import { PhotoList } from "./components/PhotoList";
import { SettingsPanel } from "./components/SettingsPanel";
import { VideoResult } from "./components/VideoResult";
import { PostHelper } from "./components/PostHelper";
import type { PendingMedia } from "./components/PostHelper";
import type { MediaItem, VideoSettings } from "./types";
import { loadFfmpeg } from "./utils/ffmpegClient";
import { buildVideo } from "./utils/buildVideo";
import type { BuildProgress } from "./utils/buildVideo";
import { readVideoDuration } from "./utils/videoMeta";

type Tab = "video" | "post-helper";

const DEFAULT_SETTINGS: VideoSettings = {
  transition: "fade",
  transitionDuration: 0.6,
  resolution: { width: 1280, height: 720 },
  fps: 30,
  musicFile: null,
};

const MAX_VIDEO_CLIP_DURATION = 8;

let nextId = 0;

function App() {
  const [tab, setTab] = useState<Tab>("video");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "loading-ffmpeg" | "building" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState<BuildProgress>({ stage: "preparing", ratio: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);

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

  async function handleGenerate() {
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

  function handleDiscard() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setStatus("idle");
  }

  function handleUseForPost() {
    if (!videoUrl) return;
    setPendingMedia({ name: "photos-video.mp4", previewUrl: videoUrl });
    setTab("post-helper");
  }

  const isBusy = status === "loading-ffmpeg" || status === "building";

  return (
    <div className="app">
      <nav className="tab-nav">
        <button
          type="button"
          className={tab === "video" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("video")}
        >
          照片轉影片
        </button>
        <button
          type="button"
          className={tab === "post-helper" ? "tab-btn active" : "tab-btn"}
          onClick={() => setTab("post-helper")}
        >
          芮的發文小幫手
        </button>
      </nav>

      {tab === "video" ? (
        <>
          <header>
            <h1>照片轉影片</h1>
            <p className="subtitle">
              上傳照片與影片片段，設定時長與轉場，一鍵生成影片 — 全部在瀏覽器本地完成
            </p>
          </header>

          {status === "done" && videoUrl ? (
            <VideoResult
              videoUrl={videoUrl}
              onDiscard={handleDiscard}
              onUseForPost={handleUseForPost}
            />
          ) : (
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
                  onClick={handleGenerate}
                >
                  {isBusy ? "生成中…" : "生成影片"}
                </button>

                {isBusy && (
                  <div className="progress">
                    <div className="progress-label">
                      {status === "loading-ffmpeg"
                        ? "正在載入影片引擎…"
                        : progress.stage === "preparing"
                          ? "正在處理素材…"
                          : "正在合成影片…"}
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {status === "error" && <p className="error-msg">生成失敗：{errorMessage}</p>}
              </div>
            </>
          )}
        </>
      ) : (
        <PostHelper pendingMedia={pendingMedia} onClearPendingMedia={() => setPendingMedia(null)} />
      )}
    </div>
  );
}

export default App;
