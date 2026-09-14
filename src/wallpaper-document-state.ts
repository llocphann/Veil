import type { MediaKind, VeilAppearance } from "./settings";

export interface WallpaperDocumentState {
  key: string;
  path: string;
  kind: Exclude<MediaKind, "">;
  layer: HTMLDivElement;
  media: HTMLImageElement | HTMLVideoElement;
  vignette: HTMLDivElement;
  appearance: VeilAppearance;
  applicationSignature?: string;
  playbackSignature?: string;
  ready: boolean;
  failed: boolean;
  disposed: boolean;
  playPromise: Promise<void> | null;
  transitionTimer: number | null;
  outgoing: WallpaperDocumentState | null;
  cleanups: Array<() => void>;
  motionQuery?: MediaQueryList;
}
