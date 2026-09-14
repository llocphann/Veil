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
      wallpaperPoolIncludeSubfolders: false,
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
      wallpaperPath: "./Wallpapers/a.webp",
    }],
  });

  assert.equal(next.wallpaperRules[0]?.id, "rule-a");
  assert.equal(next.wallpaperRules[0]?.matchValue, "Notes/A.md");
  assert.equal(next.wallpaperRules[0]?.wallpaperPath, "Wallpapers/a.webp");
});

void test("settings no-op guard runs before runtime reconciliation and persistence", () => {
  const updateBody = mainSource.match(
    /public updateSettings\([\s\S]*?\n {2}public flushSettings\(/,
  )?.[0] || "";
  const normalizeIndex = updateBody.indexOf(
    "normalizeSettingsPatch(previous, patch, normalizePath)",
  );
  const guardIndex = updateBody.indexOf("if (veilSettingsEqual(previous, next)) return;");
  assert.ok(normalizeIndex >= 0 && guardIndex > normalizeIndex);
  for (const work of [
    "rememberSettingsChanges",
    "scenes.reconcileSettings",
    "wallpaperPools.reconcileSettings",
    "systemRouting.reschedule",
    "refreshWallpaper()",
    "scheduleSave()",
  ]) {
    const workIndex = updateBody.indexOf(work);
    assert.ok(workIndex > guardIndex, `${work} must run after the no-op guard`);
  }
});

void test("settings equality no longer serializes the full settings object", () => {
  const equalitySource = fs.readFileSync("src/settings-change-detection.ts", "utf8");
  assert.doesNotMatch(equalitySource, /JSON\.stringify/);
});

void test("status updates skip identical Settings UI work", () => {
  assert.ok(
    mainSource.includes(
      "if (this.status.message === message && this.status.tone === tone) return;",
    ),
  );
});
