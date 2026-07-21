import { useCallback, useRef, useState } from "react";
import "./App.css";
import { PhotoUploader } from "./components/PhotoUploader";
import { PhotoList } from "./components/PhotoList";
import { SettingsPanel } from "./components/SettingsPanel";
import { VideoResult } from "./components/VideoResult";
import type { Photo, VideoSettings } from "./types";
import { loadFfmpeg } from "./utils/ffmpegClient";
import { buildVideo } from "./utils/buildVideo";
import type { BuildProgress } from "./utils/buildVideo";

const DEFAULT_SETTINGS: VideoSettings = {
  transition: "fade",
  transitionDuration: 0.6,
  resolution: { width: 1280, height: 720 },
  fps: 30,
  musicFile: null,
};

let nextId = 0;

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"idle" | "loading-ffmpeg" | "building" | "done" | "error">(
    "idle",
  );
  const [progress, setProgress] = useState<BuildProgress>({ stage: "preparing", ratio: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const ffmpegLoadedRef = useRef(false);

  const addFiles = useCallback((files: File[]) => {
    const newPhotos: Photo[] = files.map((file) => ({
      id: `p${nextId++}`,
      file,
      url: URL.createObjectURL(file),
      duration: 3,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updateDuration = useCallback((id: string, duration: number) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, duration } : p)));
  }, []);

  const applyDurationToAll = useCallback((duration: number) => {
    setPhotos((prev) => prev.map((p) => ({ ...p, duration })));
  }, []);

  async function handleGenerate() {
    if (photos.length === 0) return;
    setErrorMessage("");
    try {
      setStatus("loading-ffmpeg");
      const ffmpeg = await loadFfmpeg((message) => console.log("[ffmpeg]", message));
      ffmpegLoadedRef.current = true;

      setStatus("building");
      setProgress({ stage: "preparing", ratio: 0 });
      const blob = await buildVideo(ffmpeg, photos, settings, setProgress);
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
        <h1>照片转视频</h1>
        <p className="subtitle">上传照片，设置时长与转场，一键生成视频 — 全部在浏览器本地完成</p>
      </header>

      {status === "done" && videoUrl ? (
        <VideoResult videoUrl={videoUrl} onDiscard={handleDiscard} />
      ) : (
        <>
          <PhotoUploader onFilesAdded={addFiles} />

          <PhotoList
            photos={photos}
            onReorder={setPhotos}
            onRemove={removePhoto}
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
              disabled={photos.length === 0 || isBusy}
              onClick={handleGenerate}
            >
              {isBusy ? "生成中…" : "生成视频"}
            </button>

            {isBusy && (
              <div className="progress">
                <div className="progress-label">
                  {status === "loading-ffmpeg"
                    ? "正在加载视频引擎…"
                    : progress.stage === "preparing"
                      ? "正在处理照片…"
                      : "正在合成视频…"}
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {status === "error" && <p className="error-msg">生成失败：{errorMessage}</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
