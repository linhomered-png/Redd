import { useRef, useState } from "react";
import type { Photo } from "../types";

interface Props {
  photos: Photo[];
  onReorder: (photos: Photo[]) => void;
  onRemove: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
}

export function PhotoList({ photos, onReorder, onRemove, onDurationChange }: Props) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) {
      setOverIndex(null);
      return;
    }
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
    dragIndex.current = null;
    setOverIndex(null);
  }

  if (photos.length === 0) {
    return <p className="empty-hint">还没有照片，先在上方添加吧</p>;
  }

  return (
    <ul className="photo-list">
      {photos.map((photo, index) => (
        <li
          key={photo.id}
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
          <img src={photo.url} alt="" className="thumb" />
          <span className="photo-index">{index + 1}</span>
          <label className="duration-field">
            时长
            <input
              type="number"
              min={0.2}
              max={30}
              step={0.1}
              value={photo.duration}
              onChange={(e) =>
                onDurationChange(photo.id, Math.max(0.2, Number(e.target.value) || 0.2))
              }
            />
            秒
          </label>
          <button
            type="button"
            className="remove-btn"
            onClick={() => onRemove(photo.id)}
            aria-label="删除照片"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
