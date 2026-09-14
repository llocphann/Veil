import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseSource = fs.readFileSync(
  new URL("../src/settings-tab-base.ts", import.meta.url),
  "utf8",
);
const wallpaperSource = fs.readFileSync(
  new URL("../src/settings-wallpaper-definitions.ts", import.meta.url),
  "utf8",
);

void test("settings base delegates wallpaper and active-context definition ownership", () => {
  assert.match(baseSource, /createWallpaperDefinitions\(/);
  assert.match(baseSource, /createActiveContextDefinition\(/);
  assert.doesNotMatch(baseSource, /name: "Wallpaper status"/);
  assert.doesNotMatch(baseSource, /name: "Resolved appearance"/);
  assert.doesNotMatch(baseSource, /DISPLAY_MODES/);
  assert.doesNotMatch(baseSource, /mediaKind\(/);
});

void test("wallpaper definition module owns wallpaper controls and status markup", () => {
  assert.match(wallpaperSource, /export function createWallpaperDefinitions/);
  assert.match(wallpaperSource, /name: "Wallpaper status"/);
  assert.match(wallpaperSource, /vault-dashboard-wallpaper-status/);
  assert.match(wallpaperSource, /DISPLAY_MODES/);
  assert.match(wallpaperSource, /mediaKind\(file\)/);
  assert.match(wallpaperSource, /export function createActiveContextDefinition/);
  assert.match(wallpaperSource, /name: "Resolved appearance"/);
});

void test("base retains only status DOM registration lifecycle", () => {
  assert.match(baseSource, /bindWallpaperStatus: \(descEl, settingEl\) => \{/);
  assert.match(baseSource, /this\.statusEl = descEl/);
  assert.match(baseSource, /this\.statusRowEl = settingEl/);
  assert.match(baseSource, /bindActiveContext: \(descEl\) => \{/);
  assert.match(baseSource, /this\.contextEl = descEl/);
});
