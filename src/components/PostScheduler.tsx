import { useState } from "react";
import type { PostDraft, PostStatus } from "../types";

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "草稿",
  scheduled: "已排程",
  posted: "已發布",
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  posts: PostDraft[];
  onAdd: (draft: Omit<PostDraft, "id" | "createdAt">) => void;
  onUpdate: (id: string, patch: Partial<PostDraft>) => void;
  onRemove: (id: string) => void;
}

export function PostScheduler({ posts, onAdd, onUpdate, onRemove }: Props) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  function handleAdd() {
    if (!title.trim() && !caption.trim()) return;
    onAdd({
      title: title.trim() || "未命名貼文",
      caption,
      mediaName: null,
      mediaPreviewUrl: null,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: scheduledAt ? "scheduled" : "draft",
    });
    setTitle("");
    setCaption("");
    setScheduledAt("");
  }

  const sorted = [...posts].sort((a, b) => {
    if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
    if (a.scheduledAt) return -1;
    if (b.scheduledAt) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div className="post-scheduler">
      <h2>發文排程</h2>
      <p className="section-hint">手動新增貼文排程，或從上方文案產生器加入</p>

      <div className="post-form">
        <div className="settings-row">
          <label>
            標題
            <input
              type="text"
              placeholder="貼文標題（僅供內部管理）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            預計發布時間
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>
        </div>
        <label className="caption-field">
          文案內容
          <textarea
            rows={3}
            placeholder="貼文文案…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <div className="generate-bar">
          <button type="button" className="primary-btn" onClick={handleAdd}>
            新增貼文
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-hint">還沒有任何排程貼文</p>
      ) : (
        <ul className="post-list">
          {sorted.map((post) => (
            <li key={post.id} className="post-item">
              {post.mediaPreviewUrl && (
                <video src={post.mediaPreviewUrl} className="post-thumb" muted />
              )}
              <div className="post-body">
                <div className="post-header">
                  <input
                    type="text"
                    className="post-title-input"
                    value={post.title}
                    onChange={(e) => onUpdate(post.id, { title: e.target.value })}
                  />
                  <span className={`status-badge status-${post.status}`}>
                    {STATUS_LABELS[post.status]}
                  </span>
                </div>
                <textarea
                  rows={2}
                  className="post-caption-input"
                  value={post.caption}
                  onChange={(e) => onUpdate(post.id, { caption: e.target.value })}
                />
                {post.mediaName && <p className="media-tag">🎬 附加媒體：{post.mediaName}</p>}
                <div className="post-controls">
                  <label className="post-schedule-field">
                    發布時間
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(post.scheduledAt)}
                      onChange={(e) =>
                        onUpdate(post.id, {
                          scheduledAt: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                    />
                  </label>
                  <select
                    value={post.status}
                    onChange={(e) => onUpdate(post.id, { status: e.target.value as PostStatus })}
                  >
                    {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => onRemove(post.id)}
                  >
                    刪除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
