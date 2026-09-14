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
const sceneSource = fs.readFileSync(
  new URL("../src/settings-scene-definitions.ts", import.meta.url),
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

void test("wallpaper pool hides file and library without clearing them and exposes folder before scope", () => {
  assert.match(
    wallpaperSource,
    /name: "Wallpaper file"[\s\S]*?visible: \(\) => !settings\.wallpaperPoolEnabled/,
  );
  assert.match(
    wallpaperSource,
    /name: "Wallpaper library"[\s\S]*?visible: \(\) => !settings\.wallpaperPoolEnabled/,
  );
  const pool = wallpaperSource.indexOf('name: "Wallpaper pool"');
  const folder = wallpaperSource.indexOf('name: "Wallpaper folder"');
  const subfolders = wallpaperSource.indexOf('name: "Include subfolders"');
  const interval = wallpaperSource.indexOf('name: "Change interval"');
  assert.ok(pool >= 0 && folder > pool && subfolders > folder && interval > subfolders);
  assert.match(wallpaperSource, /renderVaultFolderControl\(/);
  assert.match(
    wallpaperSource,
    /actions\.setControlValue\("wallpaperPoolFolder", path\)/,
  );
  assert.match(
    wallpaperSource,
    /key: "wallpaperPoolChangeInterval"[\s\S]*?min: 5,[\s\S]*?max: 120,[\s\S]*?displayFormat: \(value\) => `\$\{value\} min`/,
  );
  assert.doesNotMatch(wallpaperSource, /wallpaperPath\s*[:=]\s*""/);
});

void test("scene pool controls follow the same folder then subfolder then interval order", () => {
  const pool = sceneSource.indexOf('name: "Wallpaper pool"');
  const folder = sceneSource.indexOf('name: "Wallpaper folder"');
  const subfolders = sceneSource.indexOf('name: "Include subfolders"');
  const interval = sceneSource.indexOf('name: "Change interval"');
  assert.ok(pool >= 0 && folder > pool && subfolders > folder && interval > subfolders);
  assert.match(
    sceneSource,
    /name: "Wallpaper file"[\s\S]*?visible: \(\) => !profile\.wallpaperPoolEnabled/,
  );
  assert.match(sceneSource, /key\("wallpaperPoolFolder"\)/);
  assert.match(
    sceneSource,
    /key: key\("wallpaperPoolChangeInterval"\)[\s\S]*?min: 5,[\s\S]*?max: 120,[\s\S]*?displayFormat: \(value\) => `\$\{value\} min`/,
  );
});

void test("base retains only status DOM registration lifecycle", () => {
  assert.match(baseSource, /bindWallpaperStatus: \(descEl, settingEl\) => \{/);
  assert.match(baseSource, /this\.statusEl = descEl/);
  assert.match(baseSource, /this\.statusRowEl = settingEl/);
  assert.match(baseSource, /bindActiveContext: \(descEl\) => \{/);
  assert.match(baseSource, /this\.contextEl = descEl/);
});
