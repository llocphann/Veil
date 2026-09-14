import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { veilSettingsEqual } from "../src/settings-change-detection";
import { normalizeSettingsPatch } from "../src/settings-patch-normalization";
import { DEFAULT_SETTINGS, type VeilSettings } from "../src/settings";

const mainSource = fs.readFileSync("src/main.ts", "utf8");

function settings(): VeilSettings {
  return {
    ...DEFAULT_SETTINGS,
    profiles: [],
    wallpaperRules: [],
    opacityExclusions: [],
  };
}

void test("equivalent normalized settings are equal", () => {
  const previous = settings();
  const next: VeilSettings = {
    ...previous,
    profiles: [...previous.profiles],
    wallpaperRules: [...previous.wallpaperRules],
    opacityExclusions: [...previous.opacityExclusions],
  };
  assert.equal(veilSettingsEqual(previous, next), true);
});

void test("nested and scalar settings changes invalidate equality", () => {
  const previous = settings();
  assert.equal(
    veilSettingsEqual(previous, { ...previous, opacity: previous.opacity + 1 }),
    false,
  );
  assert.equal(
    veilSettingsEqual(previous, {
      ...previous,
      wallpaperRules: [{
        id: "rule-a",
        enabled: true,
        matchType: "path",
        matchValue: "Notes/A.md",
        profileId: "",
        wallpaperPath: "Wallpapers/a.webp",
      }],
    }),
    false,
  );
});

void test("scalar patches preserve untouched collection identity", () => {
  const previous: VeilSettings = {
    ...settings(),
    profiles: [{
      id: "scene-a",
      name: "A",
      wallpaperPath: "Wallpapers/a.webp",
      wallpaperPoolEnabled: false,
      wallpaperPoolFolder: "Wallpapers",
      wallpaperPoolIncludeSubfolders: false,
      wallpaperPoolChangeInterval: 0,
      displayMode: "cover",
      wallpaperPositionX: 50,
      wallpaperPositionY: 50,
      wallpaperZoom: 100,
      transitionDuration: 320,
      opacity: 15,
      paneOpacity: 70,
      paneContentOpacity: 100,
      vignetteMode: "off",
      vignetteIntensity: 40,
      vignetteRadius: 55,
      blurEnabled: false,
      blurIntensity: 8,
      dimEnabled: false,
      dimIntensity: 30,
      colorOverlayEnabled: false,
      colorOverlayColor: "#7dd3fc",
      colorOverlayOpacity: 30,
      colorOverlayBlendMode: "color",
      effectPreset: "none",
      effectIntensity: 35,
      pauseWhenHidden: true,
      respectReducedMotion: true,
    }],
  };
  const next = normalizeSettingsPatch(previous, { opacity: 27 });

  assert.equal(next.opacity, 27);
  assert.equal(next.profiles, previous.profiles);
  assert.equal(next.wallpaperRules, previous.wallpaperRules);
  assert.equal(next.opacityExclusions, previous.opacityExclusions);
});

void test("scalar patch normalization keeps canonical fallback semantics", () => {
  const previous = { ...settings(), opacity: 73 };
  const next = normalizeSettingsPatch(
    previous,
    { opacity: Number.NaN },
  );
  assert.equal(next.opacity, DEFAULT_SETTINGS.opacity);
});

void test("collection patches still use canonical full normalization", () => {
  const previous = settings();
  const next = normalizeSettingsPatch(previous, {
    wallpaperRules: [{
      id: " rule-a ",
      enabled: true,
      matchType: "path",
      matchValue: "./Notes/A.md/",
      profileId: "",
      wallpaperPath: "./Wallpapers/A.webp",
    }],
  });

  assert.equal(next.wallpaperRules[0]?.id, "rule-a");
  assert.equal(next.wallpaperRules[0]?.matchValue, "Notes/A.md");
  assert.equal(next.wallpaperRules[0]?.wallpaperPath, "Wallpapers/A.webp");
});

void test("settings no-op guard runs before runtime reconciliation and persistence", () => {
  const guard = mainSource.indexOf("if (veilSettingsEqual(previous, next)) return;");
  const impact = mainSource.indexOf("const impact = classifySettingsChange(previous, next);");
  const assign = mainSource.indexOf("this.settings = next;");
  const save = mainSource.indexOf("this.scheduleSave();", assign);
  assert.ok(guard >= 0 && impact > guard && assign > impact && save > assign);
});

void test("settings equality no longer serializes the full settings object", () => {
  const source = fs.readFileSync("src/settings-change-detection.ts", "utf8");
  assert.doesNotMatch(source, /JSON\.stringify/);
});

void test("status updates skip identical Settings UI work", () => {
  assert.match(
    mainSource,
    /if \(this\.status\.message === message && this\.status\.tone === tone\) return;/,
  );
});
