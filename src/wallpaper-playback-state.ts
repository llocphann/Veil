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
  const hiddenVideoPaused = input.pauseWhenHidden && input.documentHidden;
  const reducedMotionPaused = input.respectReducedMotion && input.reducedMotion;

  // CSS effects have no visible output in a hidden document, so they always
  // pause there. Video playback remains governed by the explicit
  // pauseWhenHidden setting and can continue when the user allows it.
  const motionPaused = !opacityVisible || input.documentHidden || reducedMotionPaused;
  const shouldPlayVideo =
    input.enabled && opacityVisible && !hiddenVideoPaused && !reducedMotionPaused;

  return {
    motionPaused,
    shouldPlayVideo,
    signature: [
      input.enabled ? "enabled" : "disabled",
      opacityVisible ? "visible" : "transparent",
      input.documentHidden ? "document-hidden" : "document-visible",
      hiddenVideoPaused ? "video-hidden-paused" : "video-hidden-allowed",
      reducedMotionPaused ? "reduced-paused" : "motion-allowed",
    ].join("|"),
  };
}
