export interface TransitionStateShape<T> {
  ready: boolean;
  failed: boolean;
  layer: { isConnected: boolean };
  outgoing: T | null;
}

export function retainedOutgoingForPending<T extends TransitionStateShape<T>>(
  state: T,
): T | null {
  const outgoing = state.outgoing;
  if (!outgoing) return null;
  if (!outgoing.ready || outgoing.failed || !outgoing.layer.isConnected) return null;
  return outgoing;
}
