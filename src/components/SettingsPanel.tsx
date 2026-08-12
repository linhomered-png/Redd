import type { CaptionStyle, TransitionType, VideoSettings } from "../types";

const RESOLUTIONS: { label: string; width: number; height: number }[] = [
  { label: "直式短劇 (720×1280)", width: 720, height: 1280 },
  { label: "直式高畫質 (1080×1920)", width: 1080, height: 1920 },
  { label: "方形 (1080×1080)", width: 1080, height: 1080 },
  { label: "橫式 (1280×720)", width: 1280, height: 720 },
];

const CAPTION_STYLES: { value: CaptionStyle; label: string }[] = [
  { value: "bar", label: "字幕列（戲劇感黑底字幕）" },
  { value: "bubble", label: "對話框（漫劇風格泡泡）" },
  { value: "none", label: "不加字幕" },
];

interface Props {
  settings: VideoSettings;
  onChange: (settings: VideoSettings) => void;
  onApplyDurationToAll: (duration: number) => void;
}

export function SettingsPanel({ settings, onChange, onApplyDurationToAll }: Props) {
  const resolutionValue = `${settings.resolution.width}x${settings.resolution.height}`;

  return (
    <div className="settings-panel">
      <div className="settings-row">
        <label>
          字幕風格
          <select
            value={settings.captionStyle}
            onChange={(e) => onChange({ ...settings, captionStyle: e.target.value as CaptionStyle })}
          >
            {CAPTION_STYLES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          影片規格
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
      </div>

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
        <label>
          批量設定場景時長
          <input
            type="number"
            min={0.5}
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

        <label>
          背景音樂（可選）
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => onChange({ ...settings, musicFile: e.target.files?.[0] ?? null })}
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
        提示：字幕會直接畫在畫面上一起輸出；背景音樂會自動循環以對齊影片長度。
      </p>
    </div>
  );
}
