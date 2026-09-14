import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/settings-tab.ts", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

void test("Veil settings expose the five primary tabs in the intended order", () => {
  const expected = ["Wallpaper", "Appearance", "Behavior", "Scenes", "Routing"];
  const labels = [...source.matchAll(/\{ id: "[^"]+", label: "([^"]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(labels.slice(0, expected.length), expected);
  assert.doesNotMatch(source, /label: "Data"/);
  assert.doesNotMatch(source, /label: "About"/);
  assert.doesNotMatch(source, /label: "Actions"/);
  assert.doesNotMatch(source, /label: "Support"/);
});

void test("settings descriptions stay concise", () => {
  const block = source.match(
    /const SIMPLE_DESCRIPTIONS:[\s\S]*?= \{([\s\S]*?)\n\};/,
  )?.[1] || "";
  const descriptions = [...block.matchAll(/:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(descriptions.length >= 40);
  for (const description of descriptions) {
    const wordCount = description.trim().split(/\s+/).length;
    assert.ok(wordCount <= 10, `Description is too long (${wordCount} words): ${description}`);
  }
  assert.match(source, /\.\.\.simplifyDescriptions\(tabPanels\)/);
  assert.match(source, /\.\.\.simplifyDescriptions\(sharedSections\)/);
  assert.match(source, /Scenes: "No scenes yet\."/);
  assert.match(source, /"Wallpaper routing": "No wallpaper rules yet\."/);
  assert.match(source, /"Opacity exclusions": "No opacity exclusions yet\."/);
});

void test("data and about render as shared sections below tab content", () => {
  assert.match(source, /const sharedSections = compact\(\[/);
  assert.match(source, /"Data & recovery", "veil-settings-section-data"/);
  assert.match(source, /"About & support", "veil-settings-section-about"/);
  assert.match(source, /simplifyDescriptions\(sharedSections\)/);
  assert.doesNotMatch(source, /veil-settings-panel-data/);
  assert.doesNotMatch(source, /veil-settings-panel-about/);
});

void test("tab control follows Ledge root and control layout semantics", () => {
  assert.match(source, /classList\.add\("veil-settings-root"\)/);
  assert.match(source, /dataset\.veilSettingsTab = this\.activeSection/);
  assert.match(source, /dataset\.veilSettingsTab = sectionId/);
  assert.match(
    source,
    /setting\.controlEl\.setCssStyles\(\{[\s\S]*?width: "100%"[\s\S]*?justifyContent: "flex-start"/,
  );
  assert.doesNotMatch(source, /classList\.remove\("veil-settings-root"\)/);
  assert.doesNotMatch(source, /delete this\.containerEl\.dataset\.veilSettingsTab/);
});

void test("tab strip is frameless and centers its buttons", () => {
  const block = styles.match(/\.veil-settings-tabs\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert.match(block, /justify-content:\s*center;/);
  assert.doesNotMatch(block, /\bgap\s*:/);
  assert.doesNotMatch(block, /\bpadding\s*:/);
  assert.doesNotMatch(block, /\bborder\s*:/);
  assert.doesNotMatch(block, /\bborder-radius\s*:/);
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
