import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const transitionSource = fs.readFileSync(
  new URL("../src/settings-pool-visibility-transition.ts", import.meta.url),
  "utf8",
);
const settingsTabSource = fs.readFileSync(
  new URL("../src/settings-tab.ts", import.meta.url),
  "utf8",
);

void test("pool visibility changes use a bounded slide transition with reduced-motion fallback", () => {
  for (const name of [
    "Wallpaper file",
    "Wallpaper library",
    "Wallpaper folder",
    "Include subfolders",
    "Change interval",
  ]) {
    assert.ok(transitionSource.includes(`"${name}"`));
  }
  assert.match(transitionSource, /prefers-reduced-motion: reduce/);
  assert.match(transitionSource, /\.animate\(/);
  assert.match(transitionSource, /translateY\(-6px\)/);
  assert.match(transitionSource, /Promise\.allSettled/);
  assert.match(transitionSource, /EXIT_DURATION_MS = 140/);
  assert.match(transitionSource, /ENTER_DURATION_MS = 180/);
  assert.doesNotMatch(transitionSource, /setInterval|requestAnimationFrame/);
});

void test("only wallpaper pool toggles route settings rebuilds through the visibility transition", () => {
  assert.match(settingsTabSource, /SettingsPoolVisibilityTransition/);
  assert.match(settingsTabSource, /key === "wallpaperPoolEnabled"/);
  assert.match(settingsTabSource, /profile:\[\^:\]\+:wallpaperPoolEnabled/);
  assert.match(
    settingsTabSource,
    /override setControlValue\([\s\S]*?this\.animateNextPoolUpdate = true;[\s\S]*?super\.setControlValue\(key, value\)/,
  );
  assert.match(
    settingsTabSource,
    /override update\(\): void \{[\s\S]*?this\.poolVisibilityTransition\.run\(\(\) => super\.update\(\)\)/,
  );
  assert.match(
    settingsTabSource,
    /override hide\(\): void \{[\s\S]*?this\.poolVisibilityTransition\.clear\(\);[\s\S]*?super\.hide\(\)/,
  );
});
