export interface WallpaperPlaybackInput {
  enabled: boolean;
  opacity: number;
  pauseWhenHidden: boolean;
  documentHidden: boolean;
  respectReducedMotion: boolean;
  reducedMotion: boolean;
}

export interface WallpaperPlaybackState {
  motionPaused: boolean;
  shouldPlayVideo: boolean;
  signature: string;
}

export function wallpaperPlaybackState(
  input: WallpaperPlaybackInput,
): WallpaperPlaybackState {
  const opacityVisible = input.opacity > 0;
  const hiddenPaused = input.pauseWhenHidden && input.documentHidden;
  const reducedMotionPaused = input.respectReducedMotion && input.reducedMotion;
  const motionPaused = !opacityVisible || hiddenPaused || reducedMotionPaused;
  const shouldPlayVideo = input.enabled && !motionPaused;

  return {
    motionPaused,
    shouldPlayVideo,
    signature: [
      input.enabled ? "enabled" : "disabled",
      opacityVisible ? "visible" : "transparent",
      hiddenPaused ? "hidden-paused" : "hidden-allowed",
      reducedMotionPaused ? "reduced-paused" : "motion-allowed",
    ].join("|"),
  };
}
