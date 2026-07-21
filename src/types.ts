export interface Photo {
  id: string;
  file: File;
  url: string;
  duration: number;
}

export type TransitionType = "none" | "fade";

export interface VideoSettings {
  transition: TransitionType;
  transitionDuration: number;
  resolution: { width: number; height: number };
  fps: number;
  musicFile: File | null;
}
