import type { PostDraft } from "../types";

const STORAGE_KEY = "redd:post-drafts";

export function loadPosts(): PostDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p: Partial<PostDraft>) => ({
      id: p.id ?? crypto.randomUUID(),
      title: p.title ?? "",
      caption: p.caption ?? "",
      mediaName: p.mediaName ?? null,
      mediaPreviewUrl: null,
      scheduledAt: p.scheduledAt ?? null,
      status: p.status ?? "draft",
      createdAt: p.createdAt ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function savePosts(posts: PostDraft[]): void {
  const serializable = posts.map(({ mediaPreviewUrl: _mediaPreviewUrl, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}
