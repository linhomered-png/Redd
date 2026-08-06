import type { TransitionType, VideoSettings } from "../types";

const RESOLUTIONS: { label: string; width: number; height: number }[] = [
  { label: "720p 橫式 (1280×720)", width: 1280, height: 720 },
  { label: "1080p 橫式 (1920×1080)", width: 1920, height: 1080 },
  { label: "直式 (720×1280)", width: 720, height: 1280 },
  { label: "方形 (1080×1080)", width: 1080, height: 1080 },
];

interface Props {
  settings: VideoSettings;
  onChange: (settings: VideoSettings) => void;
  onApplyDurationToAll: (duration: number) => void;
  /** Hides the transition controls — used in narrated-script mode, where frame
   * timing is already fully derived from the narration and per-clip transitions
   * don't apply. */
  hideTransition?: boolean;
}

export function SettingsPanel({ settings, onChange, onApplyDurationToAll, hideTransition }: Props) {
  const resolutionValue = `${settings.resolution.width}x${settings.resolution.height}`;

  return (
    <div className="settings-panel">
      {!hideTransition && (
        <div className="settings-row">
          <label>
            轉場效果
            <select
              value={settings.transition}
              onChange={(e) =>
                onChange({ ...settings, transition: e.target.value as TransitionType })
              }
            >
              <option value="none">無轉場（直接切換）</option>
              <option value="fade">淡入淡出</option>
            </select>
          </label>

          {settings.transition === "fade" && (
            <label>
              轉場時長
              <input
                type="number"
                min={0.2}
                max={3}
                step={0.1}
                value={settings.transitionDuration}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    transitionDuration: Math.max(0.2, Number(e.target.value) || 0.2),
                  })
                }
              />
              秒
            </label>
          )}
        </div>
      )}

      <div className="settings-row">
        <label>
          影片解析度
          <select
            value={resolutionValue}
            onChange={(e) => {
              const found = RESOLUTIONS.find(
                (r) => `${r.width}x${r.height}` === e.target.value,
              );
              if (found) onChange({ ...settings, resolution: found });
            }}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.label} value={`${r.width}x${r.height}`}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          畫格率
          <select
            value={settings.fps}
            onChange={(e) => onChange({ ...settings, fps: Number(e.target.value) })}
          >
            <option value={24}>24 fps</option>
            <option value={30}>30 fps</option>
          </select>
        </label>
      </div>

      <div className="settings-row">
        {!hideTransition && (
          <label>
            批量設定照片時長
            <input
              type="number"
              min={0.2}
              max={30}
              step={0.1}
              placeholder="秒"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v > 0) onApplyDurationToAll(v);
                e.target.value = "";
              }}
            />
          </label>
        )}

        <label>
          背景音樂（可選）
          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              onChange({ ...settings, musicFile: e.target.files?.[0] ?? null })
            }
          />
        </label>
        {settings.musicFile && (
          <button
            type="button"
            className="link-btn"
            onClick={() => onChange({ ...settings, musicFile: null })}
          >
            移除音樂
          </button>
        )}
      </div>
      <p className="settings-hint">
        {hideTransition
          ? "提示：若有旁白，背景音樂會與旁白混音並自動降低音量；若選擇不要旁白，背景音樂就是影片唯一的聲音。"
          : "提示：影片片段的原始聲音會被靜音，只有這裡上傳的背景音樂會被保留。"}
      </p>
    </div>
  );
}
