import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/settings-tab.ts", "utf8");

void test("Veil settings follow the Ledge-style section taxonomy", () => {
  for (const section of [
    "Wallpaper",
    "Behavior",
    "Routing",
    "Appearance",
    "Scenes",
    "Data",
    "About",
  ]) {
    assert.match(source, new RegExp(`label: "${section}"`));
  }
  assert.doesNotMatch(source, /label: "Actions"/);
  assert.doesNotMatch(source, /label: "Support"/);
});

void test("technical actions are redistributed into user-facing sections", () => {
  assert.match(source, /QUICK_ACTION_NAMES[\s\S]*Reload wallpaper[\s\S]*Shuffle wallpaper pool/);
  assert.match(source, /DATA_ACTION_NAMES[\s\S]*Export settings[\s\S]*Import settings[\s\S]*Restore defaults/);
  assert.match(source, /"Framing & opacity"/);
  assert.match(source, /"Playback & motion"/);
  assert.match(source, /"Data & recovery"/);
  assert.match(source, /"About & support"/);
});

void test("settings behavior remains delegated to the preserved base implementation", () => {
  assert.match(source, /WallpaperSettingsTab as BaseWallpaperSettingsTab/);
  assert.match(source, /extends BaseWallpaperSettingsTab/);
  assert.ok(fs.existsSync("src/settings-tab-base.ts"));
});
