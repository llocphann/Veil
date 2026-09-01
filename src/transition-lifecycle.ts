export interface TransitionStateShape<T> {
  ready: boolean;
  failed: boolean;
  layer: { isConnected: boolean };
  outgoing: T | null;
}

function isWorkingState<T extends TransitionStateShape<T>>(state: T): boolean {
  return state.ready && !state.failed && state.layer.isConnected;
}

export function retainedOutgoingForPending<T extends TransitionStateShape<T>>(
  state: T,
): T | null {
  const outgoing = state.outgoing;
  if (!outgoing || !isWorkingState(outgoing)) return null;
  return outgoing;
}

export function workingWallpaperFallback<T extends TransitionStateShape<T>>(
  state: T | null,
): T | null {
  if (!state) return null;
  if (isWorkingState(state)) return state;
  return retainedOutgoingForPending(state);
}

export function shouldRetainWallpaperForUnavailableSource(
  requestedPath: string,
  hasContextAppearance: boolean,
): boolean {
  return Boolean(requestedPath || hasContextAppearance);
}
