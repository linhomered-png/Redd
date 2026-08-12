import type { CaptionStyle, Scene } from "../types";

interface Props {
  scenes: Scene[];
  activeIndex: number;
  captionStyle: CaptionStyle;
}

export function PhonePreview({ scenes, activeIndex, captionStyle }: Props) {
  const scene = scenes[activeIndex] ?? scenes[0] ?? null;

  return (
    <div className="phone-frame">
      <div className="phone-notch" aria-hidden="true" />
      <div className="phone-screen">
        {scene ? (
          <img src={scene.url} alt="" className="phone-bg" />
        ) : (
          <div className="phone-empty">上傳照片後這裡會即時預覽</div>
        )}

        {scenes.length > 0 && (
          <div className="phone-progress" aria-hidden="true">
            {scenes.map((s, i) => (
              <span key={s.id} className={`phone-progress-dot${i === activeIndex ? " active" : ""}`} />
            ))}
          </div>
        )}

        <div className="phone-tag">短劇 · EP.01</div>

        <div className="phone-side-icons" aria-hidden="true">
          <span>❤️<em>1.2k</em></span>
          <span>💬<em>328</em></span>
          <span>↗️<em>分享</em></span>
        </div>

        {scene && captionStyle !== "none" && (scene.speaker || scene.line) && (
          <div className={`phone-caption phone-caption-${captionStyle}`}>
            {scene.speaker && <div className="phone-caption-speaker">{scene.speaker}</div>}
            {scene.line && <div className="phone-caption-line">{scene.line}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
