import assert from "node:assert/strict";
import test from "node:test";
import {
  retainedOutgoingForPending,
  shouldRetainWallpaperForUnavailableSource,
  workingWallpaperFallback,
} from "../src/transition-lifecycle";

interface State {
  ready: boolean;
  failed: boolean;
  layer: { isConnected: boolean };
  outgoing: State | null;
}

function state(overrides: Partial<State> = {}): State {
  return {
    ready: false,
    failed: false,
    layer: { isConnected: true },
    outgoing: null,
    ...overrides,
  };
}

void test("rapid replacement retains the last loaded outgoing wallpaper", () => {
  const loaded = state({ ready: true });
  const pending = state({ outgoing: loaded });
  assert.equal(retainedOutgoingForPending(pending), loaded);
  assert.equal(workingWallpaperFallback(pending), loaded);
});

void test("a ready current wallpaper is preferred as the working fallback", () => {
  const outgoing = state({ ready: true });
  const current = state({ ready: true, outgoing });
  assert.equal(workingWallpaperFallback(current), current);
});

void test("failed, pending, or detached outgoing states are not retained", () => {
  const failed = state({ ready: true, failed: true });
  const pending = state({ ready: false });
  const detached = state({ ready: true, layer: { isConnected: false } });

  assert.equal(retainedOutgoingForPending(state({ outgoing: failed })), null);
  assert.equal(retainedOutgoingForPending(state({ outgoing: pending })), null);
  assert.equal(retainedOutgoingForPending(state({ outgoing: detached })), null);
});

void test("a pending state without an outgoing wallpaper has no fallback", () => {
  assert.equal(retainedOutgoingForPending(state()), null);
  assert.equal(workingWallpaperFallback(state()), null);
});

void test("unavailable configured sources retain a working wallpaper", () => {
  assert.equal(shouldRetainWallpaperForUnavailableSource("Media/missing.webp", false), true);
  assert.equal(shouldRetainWallpaperForUnavailableSource("", true), true);
});

void test("an intentionally empty default wallpaper does not retain the old wallpaper", () => {
  assert.equal(shouldRetainWallpaperForUnavailableSource("", false), false);
});
