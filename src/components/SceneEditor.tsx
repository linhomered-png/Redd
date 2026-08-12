import { useRef, useState } from "react";
import type { Scene } from "../types";

interface Props {
  scenes: Scene[];
  onReorder: (scenes: Scene[]) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Pick<Scene, "speaker" | "line" | "duration">>) => void;
  onFocusScene?: (index: number) => void;
}

export function SceneEditor({ scenes, onReorder, onRemove, onUpdate, onFocusScene }: Props) {
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    const from = dragIndex.current;
    if (from === null || from === targetIndex) {
      setOverIndex(null);
      return;
    }
    const next = [...scenes];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
    dragIndex.current = null;
    setOverIndex(null);
  }

  if (scenes.length === 0) {
    return <p className="empty-hint">還沒有場景，先在上方加入角色或場景照片吧</p>;
  }

  return (
    <ul className="scene-list">
      {scenes.map((scene, index) => (
        <li
          key={scene.id}
          className={`scene-item${overIndex === index ? " drag-over" : ""}`}
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
          <img
            src={scene.url}
            alt=""
            className="thumb"
            onClick={() => onFocusScene?.(index)}
          />
          <span className="photo-index">第 {index + 1} 幕</span>

          <div className="scene-fields">
            <input
              type="text"
              className="speaker-input"
              placeholder="角色名（可留空）"
              value={scene.speaker}
              maxLength={12}
              onFocus={() => onFocusScene?.(index)}
              onChange={(e) => onUpdate(scene.id, { speaker: e.target.value })}
            />
            <textarea
              className="line-input"
              placeholder="這一幕的台詞 / 旁白…"
              value={scene.line}
              maxLength={80}
              rows={2}
              onFocus={() => onFocusScene?.(index)}
              onChange={(e) => onUpdate(scene.id, { line: e.target.value })}
            />
          </div>

          <label className="duration-field">
            時長
            <input
              type="number"
              min={0.5}
              max={30}
              step={0.1}
              value={scene.duration}
              onChange={(e) =>
                onUpdate(scene.id, { duration: Math.max(0.5, Number(e.target.value) || 0.5) })
              }
            />
            秒
          </label>

          <button
            type="button"
            className="remove-btn"
            onClick={() => onRemove(scene.id)}
            aria-label="刪除"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
