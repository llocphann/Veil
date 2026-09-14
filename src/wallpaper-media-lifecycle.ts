import type { WallpaperDocumentState } from "./wallpaper-document-state";
import { wallpaperPlaybackState } from "./wallpaper-playback-state";

const TRANSITION_OPACITY_VARIABLE = "--vdb-transition-opacity";
const TRANSITION_CLEANUP_BUFFER = 80;

export interface CrossfadeOptions {
  document: Document;
  state: WallpaperDocumentState;
  getCurrentState: () => WallpaperDocumentState | null;
}

export function startWallpaperCrossfade(options: CrossfadeOptions): void {
  const { state, getCurrentState } = options;
  const outgoing = state.outgoing;
  if (!outgoing || outgoing.disposed || !outgoing.ready || outgoing.failed) {
    if (outgoing) disposeWallpaperState(outgoing);
    state.outgoing = null;
    state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
    delete state.layer.dataset.transitionState;
    return;
  }

  const reducedMotion =
    state.appearance.respectReducedMotion && Boolean(state.motionQuery?.matches);
  const duration = reducedMotion ? 0 : state.appearance.transitionDuration;
  if (duration <= 0) {
    disposeWallpaperState(outgoing);
    state.outgoing = null;
    state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
    delete state.layer.dataset.transitionState;
    return;
  }

  const durationValue = `${duration}ms`;
  state.layer.style.setProperty("--vdb-transition-duration", durationValue);
  outgoing.layer.style.setProperty("--vdb-transition-duration", durationValue);
  state.layer.dataset.transitionState = "incoming";
  outgoing.layer.dataset.transitionState = "outgoing";
  state.layer.setCssProps({ [TRANSITION_OPACITY_VARIABLE]: "0" });
  outgoing.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
  void state.layer.offsetWidth;

  window.requestAnimationFrame(() => {
    if (state.disposed || outgoing.disposed || getCurrentState() !== state) return;
    state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
    outgoing.layer.setCssProps({ [TRANSITION_OPACITY_VARIABLE]: "0" });
  });

  state.transitionTimer = window.setTimeout(() => {
    state.transitionTimer = null;
    if (state.outgoing !== outgoing) return;
    disposeWallpaperState(outgoing);
    state.outgoing = null;
    delete state.layer.dataset.transitionState;
  }, duration + TRANSITION_CLEANUP_BUFFER);
}

export function settleWallpaperState(state: WallpaperDocumentState): void {
  if (state.transitionTimer !== null) {
    window.clearTimeout(state.transitionTimer);
    state.transitionTimer = null;
  }
  if (state.outgoing) {
    disposeWallpaperState(state.outgoing);
    state.outgoing = null;
  }
  state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
  delete state.layer.dataset.transitionState;
}

export interface PlaybackOptions {
  document: Document;
  state: WallpaperDocumentState;
  isEnabled: () => boolean;
  isUnloaded: () => boolean;
  onError: (message: string) => void;
}

export function syncWallpaperPlayback(options: PlaybackOptions): void {
  const { document, state, isEnabled, isUnloaded, onError } = options;
  const appearance = state.appearance;
  const unloaded = isUnloaded();
  const playback = wallpaperPlaybackState({
    enabled: isEnabled() && !unloaded,
    opacity: appearance.opacity,
    pauseWhenHidden: appearance.pauseWhenHidden,
    documentHidden: document.hidden,
    respectReducedMotion: appearance.respectReducedMotion,
    reducedMotion: Boolean(state.motionQuery?.matches),
  });
  const signatureChanged = state.playbackSignature !== playback.signature;
  if (signatureChanged) {
    state.playbackSignature = playback.signature;
    const animationPaused = String(playback.motionPaused);
    if (state.layer.dataset.animationPaused !== animationPaused) {
      state.layer.dataset.animationPaused = animationPaused;
    }
  }

  if (state.kind !== "video" || state.disposed || state.failed || unloaded) return;

  const video = state.media as HTMLVideoElement;
  if (!playback.shouldPlayVideo) {
    if (!video.paused) video.pause();
    return;
  }
  if (!video.paused || state.playPromise || !video.getAttribute("src")) return;

  try {
    let interrupted = false;
    state.playPromise = Promise.resolve(video.play())
      .catch((error: unknown) => {
        if (state.disposed || isUnloaded()) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          interrupted = true;
          return;
        }
        onError(
          "Video could not autoplay. Use Reload wallpaper to retry, or check the video codec.",
        );
      })
      .finally(() => {
        state.playPromise = null;
        if (interrupted) syncWallpaperPlayback(options);
      });
  } catch {
    onError("Video playback is unavailable in this window.");
  }
}

export function disposeWallpaperState(state: WallpaperDocumentState): void {
  if (state.disposed) return;
  state.disposed = true;
  if (state.transitionTimer !== null) {
    window.clearTimeout(state.transitionTimer);
    state.transitionTimer = null;
  }
  if (state.outgoing) {
    disposeWallpaperState(state.outgoing);
    state.outgoing = null;
  }
  for (const cleanup of state.cleanups) cleanup();
  if (state.kind === "video") {
    const video = state.media as HTMLVideoElement;
    video.pause();
    video.removeAttribute("src");
    video.load();
  } else {
    state.media.removeAttribute("src");
  }
  state.layer.remove();
}
