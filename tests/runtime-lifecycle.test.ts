import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/main.ts", "utf8");
const lifecycleSource = fs.readFileSync("src/wallpaper-media-lifecycle.ts", "utf8");
const applySchedulerSource = fs.readFileSync("src/document-apply-scheduler.ts", "utf8");
const vaultInvalidationSource = fs.readFileSync("src/vault-document-invalidation.ts", "utf8");

void test("plugin unload cancels scheduled work and removes document state", () => {
  const unload = source.match(/onunload\(\): void \{([\s\S]*?)\n {2}\}/)?.[1] || "";

  assert.match(unload, /documentApply\.cancel\(\)/);
  assert.match(applySchedulerSource, /window\.cancelAnimationFrame\(this\.frame\)/);
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

void test("vault invalidation covers exact and descendant loaded or resolved paths", () => {
  assert.match(
    vaultInvalidationSource,
    /candidate === changedPath \|\| candidate\.startsWith\(`\$\{changedPath\}\/`\)/,
  );
  assert.match(vaultInvalidationSource, /vaultPathTouches\(loadedPath, changedPath\)/);
  assert.match(vaultInvalidationSource, /vaultPathTouches\(resolvedPath, changedPath\)/);
});

void test("vault events schedule only affected documents without global force refresh", () => {
  const vaultEvents = source.match(
    /private registerVaultEvents\(\): void \{([\s\S]*?)\n {2}\}\n\n {2}private applyToWorkspace/,
  )?.[1] || "";

  assert.match(vaultEvents, /refreshDocumentsAffectedByVaultPath\(file\.path\)/);
  assert.match(vaultEvents, /documentsAffectedByVaultPath\(oldPath\)/);
  assert.match(vaultEvents, /scheduleApplyToDocuments\(renamedDocuments\)/);
  assert.doesNotMatch(vaultEvents, /refreshWallpaper\(true\)/);
  assert.doesNotMatch(vaultEvents, /sourceRevision/);
});
