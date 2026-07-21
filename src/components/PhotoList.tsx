import { useRef, useState } from "react";
import type { MediaItem } from "../types";

interface Props {
  items: MediaItem[];
  onReorder: (items: MediaItem[]) => void;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

export function PhotoList({ items, onReorder, onRemove, onDurationChange }: Props) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) {
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
    dragIndex.current = null;
    setOverIndex(null);
  }

  if (items.length === 0) {
    return <p className="empty-hint">還沒有照片或影片，先在上方加入吧</p>;
  }

  return (
    <ul className="photo-list">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`photo-item${overIndex === index ? " drag-over" : ""}`}
          draggable
          onDragStart={() => (dragIndex.current = index)}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(index);
          }}
          onDragLeave={() => setOverIndex((i) => (i === index ? null : i))}
          onDrop={() => handleDrop(index)}
        >
          <span className="drag-handle" aria-hidden="true">
            ⠿
          </span>
          {item.kind === "video" ? (
            <video src={item.url} className="thumb" muted playsInline preload="metadata" />
          ) : (
            <img src={item.url} alt="" className="thumb" />
          )}
          <span className="photo-index">{index + 1}</span>
          <span className="kind-badge">{item.kind === "video" ? "影片" : "照片"}</span>
          <label className="duration-field">
            {item.kind === "video" ? "擷取" : "時長"}
            <input
              type="number"
              min={0.2}
              max={item.kind === "video" && item.sourceDuration ? item.sourceDuration : 30}
              step={0.1}
              value={item.duration}
              onChange={(e) =>
                onDurationChange(item.id, Math.max(0.2, Number(e.target.value) || 0.2))
              }
            />
            秒
            {item.kind === "video" && item.sourceDuration && (
              <span className="source-duration-hint">
                （原長 {item.sourceDuration.toFixed(1)}s）
              </span>
            )}
          </label>
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
  );
}
