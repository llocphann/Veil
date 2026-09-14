import assert from "node:assert/strict";
import test from "node:test";
import {
  markWallpaperMediaActive,
  markWallpaperMediaDisposed,
  markWallpaperMediaFailed,
  markWallpaperMediaReady,
  markWallpaperMediaTransitioning,
  type WallpaperMediaPhaseState,
} from "../src/wallpaper-media-phase";

function state(): WallpaperMediaPhaseState {
  return {
    phase: "loading",
    ready: false,
    failed: false,
    disposed: false,
  };
}

void test("media progresses from loading through transition to active", () => {
  const media = state();
  markWallpaperMediaReady(media);
  assert.deepEqual(media, {
    phase: "active",
    ready: true,
    failed: false,
    disposed: false,
  });

  markWallpaperMediaTransitioning(media);
  assert.equal(media.phase, "transitioning");
  markWallpaperMediaActive(media);
  assert.equal(media.phase, "active");
});

void test("failed media cannot be reactivated", () => {
  const media = state();
  markWallpaperMediaFailed(media);
  assert.equal(media.phase, "failed");
  assert.equal(media.failed, true);
  markWallpaperMediaReady(media);
  markWallpaperMediaTransitioning(media);
  markWallpaperMediaActive(media);
  assert.equal(media.phase, "failed");
});

void test("disposed media is terminal", () => {
  const media = state();
  markWallpaperMediaReady(media);
  markWallpaperMediaDisposed(media);
  assert.equal(media.phase, "disposed");
  assert.equal(media.disposed, true);
  markWallpaperMediaReady(media);
  markWallpaperMediaTransitioning(media);
  markWallpaperMediaActive(media);
  markWallpaperMediaFailed(media);
  assert.equal(media.phase, "disposed");
});
