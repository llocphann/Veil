import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/settings-tab.ts", "utf8");

void test("Veil settings expose only the five primary Ledge-style tabs", () => {
  for (const section of [
    "Wallpaper",
    "Behavior",
    "Routing",
    "Appearance",
    "Scenes",
  ]) {
    assert.match(source, new RegExp(`label: "${section}"`));
  }
  assert.doesNotMatch(source, /label: "Data"/);
  assert.doesNotMatch(source, /label: "About"/);
  assert.doesNotMatch(source, /label: "Actions"/);
  assert.doesNotMatch(source, /label: "Support"/);
});

void test("data and about render as shared sections below tab content", () => {
  assert.match(source, /const sharedSections = compact\(\[/);
  assert.match(source, /"Data & recovery", "veil-settings-section-data"/);
  assert.match(source, /"About & support", "veil-settings-section-about"/);
  assert.match(source, /return \[this\.navigationDefinition\(\), \.\.\.tabPanels, \.\.\.sharedSections\]/);
  assert.doesNotMatch(source, /veil-settings-panel-data/);
  assert.doesNotMatch(source, /veil-settings-panel-about/);
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
