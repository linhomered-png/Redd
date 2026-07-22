import { useEffect, useState } from "react";
import { CaptionGenerator } from "./CaptionGenerator";
import { PostScheduler } from "./PostScheduler";
import type { PostDraft } from "../types";
import type { GeneratedCaption } from "../utils/captionTemplates";
import { loadPosts, savePosts } from "../utils/postStorage";

export interface PendingMedia {
  name: string;
  previewUrl: string;
}

interface Props {
  pendingMedia: PendingMedia | null;
  onClearPendingMedia: () => void;
}

export function PostHelper({ pendingMedia, onClearPendingMedia }: Props) {
  const [posts, setPosts] = useState<PostDraft[]>(() => loadPosts());

  useEffect(() => {
    savePosts(posts);
  }, [posts]);

  function addPost(draft: Omit<PostDraft, "id" | "createdAt">) {
    const post: PostDraft = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [post, ...prev]);
  }

  function handleUseCaption(topic: string, caption: GeneratedCaption) {
    addPost({
      title: topic.trim() || "未命名貼文",
      caption: `${caption.text}\n\n${caption.hashtags.join(" ")}`,
      mediaName: pendingMedia?.name ?? null,
      mediaPreviewUrl: pendingMedia?.previewUrl ?? null,
      scheduledAt: null,
      status: "draft",
    });
  }

  function updatePost(id: string, patch: Partial<PostDraft>) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="post-helper">
      <header className="post-helper-header">
        <h1>芮的發文小幫手</h1>
        <p className="subtitle">產生 Instagram 貼文文案，並管理發文排程 — 全部在瀏覽器本地完成</p>
      </header>

      {pendingMedia && (
        <div className="pending-media-banner">
          <span>🎬 已附加剛才產生的影片：{pendingMedia.name}，加入排程時會自動帶入</span>
          <button type="button" className="link-btn" onClick={onClearPendingMedia}>
            清除附加
          </button>
        </div>
      )}

      <CaptionGenerator onUseCaption={handleUseCaption} />
      <PostScheduler posts={posts} onAdd={addPost} onUpdate={updatePost} onRemove={removePost} />
    </div>
  );
}
