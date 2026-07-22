export type MediaKind = "image" | "video";

export interface MediaItem {
  id: string;
  file: File;
  kind: MediaKind;
  url: string;
  duration: number;
  /** Actual clip length in seconds, only known for videos once metadata loads. */
  sourceDuration: number | null;
}

export type TransitionType = "none" | "fade";

export interface VideoSettings {
  transition: TransitionType;
  transitionDuration: number;
  resolution: { width: number; height: number };
  fps: number;
  musicFile: File | null;
}

export type CaptionCategory =
  | "new-product"
  | "promotion"
  | "brand-story"
  | "engagement"
  | "event";

export type CaptionTone = "enthusiastic" | "professional" | "cute";

export type PostStatus = "draft" | "scheduled" | "posted";

export interface PostDraft {
  id: string;
  title: string;
  caption: string;
  mediaName: string | null;
  mediaPreviewUrl: string | null;
  scheduledAt: string | null;
  status: PostStatus;
  createdAt: string;
}
