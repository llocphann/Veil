import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  appendOpacityExclusion,
  appendScene,
  appendWallpaperRule,
  copyGlobalAppearanceToScene,
  deleteOpacityExclusion,
  deleteScene,
  deleteWallpaperRule,
  duplicateScene,
  reorderOpacityExclusions,
  reorderScenes,
  reorderWallpaperRules,
} from "../src/settings-collection-model";
import {
  DEFAULT_SETTINGS,
  createOpacityExclusionRule,
  createProfile,
  createWallpaperRule,
  type VeilSettings,
} from "../src/settings";

function settingsFixture(): VeilSettings {
  const base: VeilSettings = {
    ...DEFAULT_SETTINGS,
    wallpaperPath: "Media/global.webp",
    opacity: 42,
    profiles: [],
    wallpaperRules: [],
    opacityExclusions: [],
  };
  const first = createProfile([], base);
  first.id = "scene-a";
  first.name = "A";
  first.wallpaperPath = "Media/a.webp";
  const second = createProfile([first], base);
  second.id = "scene-b";
  second.name = "B";
  second.wallpaperPath = "Media/b.webp";
  const rule = createWallpaperRule([]);
  rule.id = "wallpaper-a";
  rule.profileId = "scene-a";
  rule.wallpaperPath = "Media/legacy.webp";
  const opacityRule = createOpacityExclusionRule([]);
  opacityRule.id = "opacity-a";
  return {
    ...base,
    profiles: [first, second],
    wallpaperRules: [rule],
    opacityExclusions: [opacityRule],
  };
}

void test("scene append and reorder preserve collection semantics", () => {
  const settings = settingsFixture();
  const appended = appendScene(settings);
  assert.equal(appended.length, 3);
  assert.deepEqual(settings.profiles.map((profile) => profile.id), ["scene-a", "scene-b"]);

  const reordered = reorderScenes(settings.profiles, 0, 1);
  assert.deepEqual(reordered?.map((profile) => profile.id), ["scene-b", "scene-a"]);
  assert.equal(reorderScenes(settings.profiles, 9, 0), null);
});

void test("scene duplication inserts an independent copy after the source", () => {
  const settings = settingsFixture();
  const profiles = duplicateScene(settings, "scene-a");
  assert.ok(profiles);
  assert.equal(profiles.length, 3);
  assert.equal(profiles[0]?.id, "scene-a");
  assert.notEqual(profiles[1]?.id, "scene-a");
  assert.equal(profiles[1]?.wallpaperPath, "Media/a.webp");
  assert.equal(profiles[2]?.id, "scene-b");
  assert.equal(duplicateScene(settings, "missing"), null);
});

void test("copying global appearance preserves scene identity", () => {
  const settings = settingsFixture();
  const profiles = copyGlobalAppearanceToScene(settings, "scene-a");
  assert.ok(profiles);
  const copied = profiles.find((profile) => profile.id === "scene-a");
  assert.equal(copied?.name, "A");
  assert.equal(copied?.wallpaperPath, "Media/global.webp");
  assert.equal(copied?.opacity, 42);
  assert.equal(copyGlobalAppearanceToScene(settings, "missing"), null);
});

void test("deleting a scene preserves its wallpaper as the legacy rule fallback", () => {
  const settings = settingsFixture();
  const next = deleteScene(settings, "scene-a");
  assert.ok(next);
  assert.deepEqual(next.profiles.map((profile) => profile.id), ["scene-b"]);
  assert.equal(next.wallpaperRules[0]?.profileId, "");
  assert.equal(next.wallpaperRules[0]?.wallpaperPath, "Media/a.webp");
  assert.equal(settings.wallpaperRules[0]?.profileId, "scene-a");
  assert.equal(deleteScene(settings, "missing"), null);
});

void test("routing collection transforms add, reorder, and delete without mutating inputs", () => {
  const settings = settingsFixture();
  const wallpaperRules = appendWallpaperRule(settings.wallpaperRules);
  const opacityRules = appendOpacityExclusion(settings.opacityExclusions);
  assert.equal(wallpaperRules.length, 2);
  assert.equal(opacityRules.length, 2);
  assert.equal(settings.wallpaperRules.length, 1);
  assert.equal(settings.opacityExclusions.length, 1);

  const reorderedWallpaper = reorderWallpaperRules(wallpaperRules, 0, 1);
  const reorderedOpacity = reorderOpacityExclusions(opacityRules, 0, 1);
  assert.equal(reorderedWallpaper?.[1]?.id, "wallpaper-a");
  assert.equal(reorderedOpacity?.[1]?.id, "opacity-a");
  assert.equal(reorderWallpaperRules(wallpaperRules, 9, 0), null);
  assert.equal(reorderOpacityExclusions(opacityRules, 9, 0), null);

  assert.equal(deleteWallpaperRule(wallpaperRules, "wallpaper-a")?.length, 1);
  assert.equal(deleteWallpaperRule(wallpaperRules, "missing"), null);
  assert.equal(deleteOpacityExclusion(opacityRules, "opacity-a")?.length, 1);
  assert.equal(deleteOpacityExclusion(opacityRules, "missing"), null);
});

void test("settings base delegates collection mutation ownership", () => {
  const source = fs.readFileSync(
    new URL("../src/settings-tab-base.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /appendScene\(this\.plugin\.settings\)/);
  assert.match(source, /reorderScenes\(/);
  assert.match(source, /duplicateSceneCollection\(/);
  assert.match(source, /removeScene\(/);
  assert.match(source, /appendWallpaperRule\(/);
  assert.match(source, /appendOpacityExclusion\(/);
  assert.doesNotMatch(source, /duplicateSceneProfile\(/);
  assert.doesNotMatch(source, /createWallpaperRule\(/);
  assert.doesNotMatch(source, /createOpacityExclusionRule\(/);
});
