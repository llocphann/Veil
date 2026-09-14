import assert from "node:assert/strict";
import test from "node:test";
import { wallpaperPlaybackState } from "../src/wallpaper-playback-state";

function playback(overrides: Partial<Parameters<typeof wallpaperPlaybackState>[0]> = {}) {
  return wallpaperPlaybackState({
    enabled: true,
    opacity: 100,
    pauseWhenHidden: true,
    documentHidden: false,
    respectReducedMotion: true,
    reducedMotion: false,
    ...overrides,
  });
}

void test("visual settings outside playback inputs cannot affect playback identity", () => {
  const first = playback();
  const second = playback();
  assert.equal(first.signature, second.signature);
  assert.equal(first.shouldPlayVideo, true);
});

void test("zero opacity pauses motion and video playback", () => {
  const state = playback({ opacity: 0 });
  assert.equal(state.motionPaused, true);
  assert.equal(state.shouldPlayVideo, false);
});

void test("hidden documents always pause visual effects", () => {
  assert.equal(
    playback({ documentHidden: true, pauseWhenHidden: true }).motionPaused,
    true,
  );
  assert.equal(
    playback({ documentHidden: true, pauseWhenHidden: false }).motionPaused,
    true,
  );
});

void test("hidden video playback still follows the explicit policy", () => {
  assert.equal(
    playback({ documentHidden: true, pauseWhenHidden: true }).shouldPlayVideo,
    false,
  );
  assert.equal(
    playback({ documentHidden: true, pauseWhenHidden: false }).shouldPlayVideo,
    true,
  );
});

void test("visibility changes invalidate playback identity even when video may continue", () => {
  const visible = playback({ documentHidden: false, pauseWhenHidden: false });
  const hidden = playback({ documentHidden: true, pauseWhenHidden: false });
  assert.notEqual(visible.signature, hidden.signature);
  assert.equal(hidden.motionPaused, true);
  assert.equal(hidden.shouldPlayVideo, true);
});

void test("reduced motion pauses only when respected", () => {
  assert.equal(
    playback({ reducedMotion: true, respectReducedMotion: true }).shouldPlayVideo,
    false,
  );
  assert.equal(
    playback({ reducedMotion: true, respectReducedMotion: false }).shouldPlayVideo,
    true,
  );
});

void test("disabled Veil never requests video playback", () => {
  const state = playback({ enabled: false });
  assert.equal(state.motionPaused, false);
  assert.equal(state.shouldPlayVideo, false);
});
