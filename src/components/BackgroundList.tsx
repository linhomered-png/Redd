import type { MediaItem } from "../types";

interface Props {
  items: MediaItem[];
  onRemove: (id: string) => void;
}

/** Lightweight background-photo list for narrated-script mode: thumbnails only,
 * no per-item duration (that's derived from the narration timing instead). */
export function BackgroundList({ items, onRemove }: Props) {
  if (items.length === 0) {
    return <p className="empty-hint">還沒有背景照片，先在上方加入吧</p>;
  }

  return (
    <>
      <ul className="photo-list">
        {items.map((item, index) => (
          <li key={item.id} className="photo-item">
            <img src={item.url} alt="" className="thumb" />
            <span className="photo-index">{index + 1}</span>
            <button
              type="button"
              className="remove-btn"
              onClick={() => onRemove(item.id)}
              aria-label="刪除"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <p className="settings-hint">背景會依順序輪流套用到每一句字幕</p>
    </>
  );
}
