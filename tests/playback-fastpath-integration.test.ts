import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lifecycle = readFileSync(
  new URL("../src/wallpaper-media-lifecycle.ts", import.meta.url),
  "utf8",
);
const stateSource = readFileSync(
  new URL("../src/wallpaper-document-state.ts", import.meta.url),
  "utf8",
);

void test("document state caches playback identity separately from appearance", () => {
  assert.match(stateSource, /playbackSignature\?: string/);
  assert.match(stateSource, /applicationSignature\?: string/);
});

void test("playback sync mutates animation state only when playback identity changes", () => {
  assert.match(
    lifecycle,
    /const signatureChanged = state\.playbackSignature !== playback\.signature/,
  );
  assert.match(
    lifecycle,
    /if \(signatureChanged\) \{[\s\S]*?state\.playbackSignature = playback\.signature;[\s\S]*?dataset\.animationPaused/,
  );
});

void test("unchanged running videos do not call play again", () => {
  assert.match(
    lifecycle,
    /if \(!video\.paused \|\| state\.playPromise \|\| !video\.getAttribute\("src"\)\) return;/,
  );
});

void test("interrupted autoplay can retry even with the same playback signature", () => {
  assert.match(lifecycle, /error instanceof DOMException && error\.name === "AbortError"/);
  assert.match(lifecycle, /if \(interrupted\) syncWallpaperPlayback\(options\)/);
});
