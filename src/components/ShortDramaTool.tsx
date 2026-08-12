import { useCallback, useState } from "react";
import { PhonePreview } from "./PhonePreview";
import { SceneEditor } from "./SceneEditor";
import { SceneUploader } from "./SceneUploader";
import { SettingsPanel } from "./SettingsPanel";
import { VideoResult } from "./VideoResult";
import type { MediaItem, Scene, VideoSettings } from "../types";
import { loadFfmpeg } from "../utils/ffmpegClient";
import { buildVideo } from "../utils/buildVideo";
import type { BuildProgress } from "../utils/buildVideo";
import { renderSceneFrame } from "../utils/renderSceneFrame";

const DEFAULT_SETTINGS: VideoSettings = {
  transition: "fade",
  transitionDuration: 0.6,
  resolution: { width: 720, height: 1280 },
  fps: 30,
  musicFile: null,
  captionStyle: "bar",
};

type Status = "idle" | "loading-ffmpeg" | "baking" | "building" | "done" | "error";

let nextId = 0;

interface Props {
  onBack: () => void;
}

export function ShortDramaTool({ onBack }: Props) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [settings, setSettings] = useState<VideoSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<BuildProgress>({ stage: "preparing", ratio: 0 });
  const [bakeRatio, setBakeRatio] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const addFiles = useCallback((files: File[]) => {
    const newScenes: Scene[] = files.map((file) => ({
      id: `s${nextId++}`,
      file,
      url: URL.createObjectURL(file),
      speaker: "",
      line: "",
      duration: 3,
    }));
    setScenes((prev) => [...prev, ...newScenes]);
  }, []);

  const removeScene = useCallback((id: string) => {
    setScenes((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const updateScene = useCallback(
    (id: string, patch: Partial<Pick<Scene, "speaker" | "line" | "duration">>) => {
      setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [],
  );

  const applyDurationToAll = useCallback((duration: number) => {
    setScenes((prev) => prev.map((s) => ({ ...s, duration })));
  }, []);

  async function handleGenerate() {
    if (scenes.length === 0) return;
    setErrorMessage("");
    try {
      setStatus("loading-ffmpeg");
      const ffmpeg = await loadFfmpeg((message) => console.log("[ffmpeg]", message));

      setStatus("baking");
      setBakeRatio(0);
      const { width, height } = settings.resolution;
      const items: MediaItem[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const blob = await renderSceneFrame(
          scene.file,
          width,
          height,
          { speaker: scene.speaker, line: scene.line },
          settings.captionStyle,
        );
        const bakedFile = new File([blob], `scene${i}.jpg`, { type: "image/jpeg" });
        items.push({
          id: scene.id,
          file: bakedFile,
          kind: "image",
          url: scene.url,
          duration: scene.duration,
          sourceDuration: null,
        });
        setBakeRatio((i + 1) / scenes.length);
      }

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

  const isBusy = status === "loading-ffmpeg" || status === "baking" || status === "building";

  return (
    <div className="app">
      <header>
        <button type="button" className="back-btn" onClick={onBack}>
          ← 回介紹頁
        </button>
        <h1>短劇快剪</h1>
        <p className="subtitle">上傳照片、寫台詞、選字幕風格，一鍵生成短劇影片 — 全部在瀏覽器本地完成</p>
      </header>

      {status === "done" && videoUrl ? (
        <VideoResult videoUrl={videoUrl} onDiscard={handleDiscard} />
      ) : (
        <div className="tool-layout">
          <div className="tool-main">
            <SceneUploader onFilesAdded={addFiles} />

            <SceneEditor
              scenes={scenes}
              onReorder={setScenes}
              onRemove={removeScene}
              onUpdate={updateScene}
              onFocusScene={setPreviewIndex}
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
                disabled={scenes.length === 0 || isBusy}
                onClick={handleGenerate}
              >
                {isBusy ? "生成中…" : "生成短劇影片"}
              </button>

              {isBusy && (
                <div className="progress">
                  <div className="progress-label">
                    {status === "loading-ffmpeg"
                      ? "正在載入影片引擎…"
                      : status === "baking"
                        ? "正在繪製字幕畫面…"
                        : progress.stage === "preparing"
                          ? "正在處理素材…"
                          : "正在合成影片…"}
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.round(
                          (status === "baking" ? bakeRatio : progress.ratio) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status === "error" && <p className="error-msg">生成失敗：{errorMessage}</p>}
            </div>
          </div>

          <div className="tool-preview">
            <PhonePreview scenes={scenes} activeIndex={previewIndex} captionStyle={settings.captionStyle} />
          </div>
        </div>
      )}
    </div>
  );
}
