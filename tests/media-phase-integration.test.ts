import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const lifecycleSource = readFileSync(
  new URL("../src/wallpaper-media-lifecycle.ts", import.meta.url),
  "utf8",
);

void test("new wallpaper states begin in the loading phase", () => {
  assert.match(mainSource, /phase: "loading"/);
});

void test("media load and error events use lifecycle phase helpers", () => {
  assert.match(mainSource, /markWallpaperMediaReady\(activeState\)/);
  assert.match(mainSource, /markWallpaperMediaFailed\(activeState\)/);
  assert.doesNotMatch(mainSource, /activeState\.ready = true/);
  assert.doesNotMatch(mainSource, /activeState\.failed = true/);
});

void test("crossfade owns transitioning and active phases", () => {
  assert.match(lifecycleSource, /markWallpaperMediaTransitioning\(state\)/);
  assert.match(lifecycleSource, /markWallpaperMediaActive\(state\)/);
});

void test("disposal moves media into the terminal disposed phase", () => {
  assert.match(lifecycleSource, /markWallpaperMediaDisposed\(state\)/);
  assert.doesNotMatch(lifecycleSource, /state\.disposed = true/);
});
