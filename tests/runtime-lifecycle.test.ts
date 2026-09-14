import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/main.ts", "utf8");
const lifecycleSource = fs.readFileSync("src/wallpaper-media-lifecycle.ts", "utf8");

void test("plugin unload cancels scheduled work and removes document state", () => {
  const unload = source.match(/onunload\(\): void \{([\s\S]*?)\n {2}\}/)?.[1] || "";

  assert.match(unload, /cancelAnimationFrame\(this\.refreshFrame\)/);
  assert.match(unload, /systemRouting\.clear\(\)/);
  assert.match(unload, /flushSettings\(\)/);
  assert.match(unload, /clearAllDocuments\(\)/);
  assert.match(unload, /documentContexts\.clear\(\)/);
  assert.match(unload, /wallpaperPools\.clear\(\)/);
});

void test("document disposal releases timers, listeners, media resources, and DOM", () => {
  assert.match(lifecycleSource, /clearTimeout\(state\.transitionTimer\)/);
  assert.match(lifecycleSource, /for \(const cleanup of state\.cleanups\) cleanup\(\)/);
  assert.match(lifecycleSource, /video\.pause\(\)/);
  assert.match(lifecycleSource, /video\.removeAttribute\("src"\)/);
  assert.match(lifecycleSource, /state\.media\.removeAttribute\("src"\)/);
  assert.match(lifecycleSource, /state\.layer\.remove\(\)/);
});

void test("media lifecycle owns crossfade timers and playback retries", () => {
  assert.match(lifecycleSource, /export function startWallpaperCrossfade/);
  assert.match(lifecycleSource, /window\.requestAnimationFrame/);
  assert.match(lifecycleSource, /state\.transitionTimer = window\.setTimeout/);
  assert.match(lifecycleSource, /export function syncWallpaperPlayback/);
  assert.match(lifecycleSource, /error instanceof DOMException && error\.name === "AbortError"/);
  assert.match(lifecycleSource, /if \(interrupted\) syncWallpaperPlayback\(options\)/);
  assert.match(lifecycleSource, /isEnabled\(\)/);
});

void test("closing a pop-out drops its leaf cache and wallpaper layer", () => {
  assert.match(
    source,
    /workspace\.on\("window-close",[\s\S]*?documentContexts\.forgetDocument\(window\.document\);[\s\S]*?clearDocument\(window\.document\)/,
  );
});

void test("folder rename refreshes loaded descendant wallpaper paths", () => {
  assert.match(
    source,
    /state\.path === oldPath \|\| state\.path\.startsWith\(`\$\{oldPath\}\/`\)/,
  );
});

void test("folder changes refresh configured and loaded descendant wallpaper paths", () => {
  assert.ok(source.includes("candidate === path || candidate.startsWith(`${path}/`)"));
  assert.ok(source.includes("some((state) => touches(state.path))"));
  assert.ok(source.includes("selectedPaths.some(touches) || loadedPath"));
});
