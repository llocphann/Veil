export type WallpaperMediaPhase =
  | "loading"
  | "transitioning"
  | "active"
  | "failed"
  | "disposed";

export interface WallpaperMediaPhaseState {
  phase: WallpaperMediaPhase;
  ready: boolean;
  failed: boolean;
  disposed: boolean;
}

export function markWallpaperMediaReady(state: WallpaperMediaPhaseState): void {
  if (state.disposed || state.failed) return;
  state.ready = true;
  state.phase = "active";
}

export function markWallpaperMediaTransitioning(state: WallpaperMediaPhaseState): void {
  if (state.disposed || state.failed || !state.ready) return;
  state.phase = "transitioning";
}

export function markWallpaperMediaActive(state: WallpaperMediaPhaseState): void {
  if (state.disposed || state.failed || !state.ready) return;
  state.phase = "active";
}

export function markWallpaperMediaFailed(state: WallpaperMediaPhaseState): void {
  if (state.disposed) return;
  state.failed = true;
  state.phase = "failed";
}

export function markWallpaperMediaDisposed(state: WallpaperMediaPhaseState): void {
  state.disposed = true;
  state.phase = "disposed";
}
