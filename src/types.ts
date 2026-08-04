export type MediaKind = "image" | "video" | "text";

export interface MediaItem {
  id: string;
  /** Null for text cards, which are rendered from `text`/`bgColor`/`textColor` instead of a file. */
  file: File | null;
  kind: MediaKind;
  url: string;
  duration: number;
  /** Actual clip length in seconds, only known for videos once metadata loads. */
  sourceDuration: number | null;
  /** Only used when kind === "text". */
  text?: string;
  bgColor?: string;
  textColor?: string;
}

export type TransitionType = "none" | "fade";

export interface VideoSettings {
  transition: TransitionType;
  transitionDuration: number;
  resolution: { width: number; height: number };
  fps: number;
  musicFile: File | null;
}
