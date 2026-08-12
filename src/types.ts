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

export type CaptionStyle = "bar" | "bubble" | "none";

export interface VideoSettings {
  transition: TransitionType;
  transitionDuration: number;
  resolution: { width: number; height: number };
  fps: number;
  musicFile: File | null;
  captionStyle: CaptionStyle;
}

/** One shot in the short drama: a photo plus the dialogue spoken over it. */
export interface Scene {
  id: string;
  file: File;
  url: string;
  speaker: string;
  line: string;
  duration: number;
}
