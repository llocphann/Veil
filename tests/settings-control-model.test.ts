import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  controlValue,
  findProfile,
  findRule,
  globalControlRequiresRender,
  parseProfileControlKey,
  parseRuleControlKey,
  profileControlRequiresRender,
  ruleControlRequiresRender,
  setRuleControlValue,
} from "../src/settings-control-model";
import {
  DEFAULT_SETTINGS,
  createOpacityExclusionRule,
  createProfile,
  createWallpaperRule,
  type VeilSettings,
} from "../src/settings";

function settingsFixture(): VeilSettings {
  const settings: VeilSettings = {
    ...DEFAULT_SETTINGS,
    profiles: [],
    wallpaperRules: [],
    opacityExclusions: [],
  };
  const profile = createProfile([], settings);
  profile.id = "scene-1";
  profile.name = "Focus";
  const wallpaperRule = createWallpaperRule([]);
  wallpaperRule.id = "wallpaper-1";
  wallpaperRule.matchValue = "Projects";
  const opacityRule = createOpacityExclusionRule([]);
  opacityRule.id = "opacity-1";
  opacityRule.excludePaneSurface = true;
  return {
    ...settings,
    profiles: [profile],
    wallpaperRules: [wallpaperRule],
    opacityExclusions: [opacityRule],
  };
}

void test("control keys parse only supported profile and rule namespaces", () => {
  assert.deepEqual(parseProfileControlKey("profile:scene-1:name"), {
    id: "scene-1",
    field: "name",
  });
  assert.deepEqual(parseRuleControlKey("wallpaper-rule:wallpaper-1:matchValue"), {
    kind: "wallpaper",
    id: "wallpaper-1",
    field: "matchValue",
  });
  assert.deepEqual(parseRuleControlKey("opacity-rule:opacity-1:excludePaneSurface"), {
    kind: "opacity",
    id: "opacity-1",
    field: "excludePaneSurface",
  });
  assert.equal(parseProfileControlKey("profile::name"), null);
  assert.equal(parseRuleControlKey("other:rule:enabled"), null);
});

void test("control values resolve global, scene, and routing state", () => {
  const settings = settingsFixture();
  assert.equal(controlValue(settings, "enabled"), settings.enabled);
  assert.equal(controlValue(settings, "profile:scene-1:name"), "Focus");
  assert.equal(controlValue(settings, "wallpaper-rule:wallpaper-1:matchValue"), "Projects");
  assert.equal(controlValue(settings, "opacity-rule:opacity-1:excludePaneSurface"), true);
  assert.equal(controlValue(settings, "profile:missing:name"), undefined);
  assert.equal(controlValue(settings, "not-a-setting"), undefined);
  assert.equal(findProfile(settings, "scene-1")?.name, "Focus");
  assert.equal(findRule(settings, "wallpaper", "wallpaper-1")?.id, "wallpaper-1");
  assert.equal(findRule(settings, "opacity", "opacity-1")?.id, "opacity-1");
});

void test("rule control mutation preserves existing coercion semantics", () => {
  const settings = settingsFixture();
  const wallpaperRule = settings.wallpaperRules[0];
  const opacityRule = settings.opacityExclusions[0];
  assert.ok(wallpaperRule);
  assert.ok(opacityRule);

  setRuleControlValue(wallpaperRule, "enabled", "true");
  assert.equal(wallpaperRule.enabled, false);
  setRuleControlValue(wallpaperRule, "enabled", true);
  assert.equal(wallpaperRule.enabled, true);

  setRuleControlValue(wallpaperRule, "matchType", "tag");
  assert.equal(wallpaperRule.matchType, "tag");
  setRuleControlValue(wallpaperRule, "matchType", "unsupported");
  assert.equal(wallpaperRule.matchType, "path");

  setRuleControlValue(wallpaperRule, "profileId", 42);
  assert.equal(wallpaperRule.profileId, "");
  setRuleControlValue(wallpaperRule, "wallpaperPath", "Media/focus.webp");
  assert.equal(wallpaperRule.wallpaperPath, "Media/focus.webp");

  setRuleControlValue(opacityRule, "excludePaneSurface", false);
  setRuleControlValue(opacityRule, "excludePaneContent", true);
  assert.equal(opacityRule.excludePaneSurface, false);
  assert.equal(opacityRule.excludePaneContent, true);
});

void test("render invalidation classification remains explicit", () => {
  assert.equal(globalControlRequiresRender("wallpaperPoolEnabled"), true);
  assert.equal(globalControlRequiresRender("opacity"), false);
  assert.equal(profileControlRequiresRender("wallpaperPath"), true);
  assert.equal(profileControlRequiresRender("opacity"), false);
  assert.equal(ruleControlRequiresRender("profileId"), true);
  assert.equal(ruleControlRequiresRender("matchValue"), false);
});

void test("settings base delegates control-model ownership", () => {
  const source = fs.readFileSync(
    new URL("../src/settings-tab-base.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /controlValue\(this\.plugin\.settings, key\)/);
  assert.match(source, /parseProfileControlKey\(key\)/);
  assert.match(source, /parseRuleControlKey\(key\)/);
  assert.match(source, /setRuleControlValue\(/);
  assert.doesNotMatch(source, /private parseProfileKey/);
  assert.doesNotMatch(source, /private parseRuleKey/);
  assert.doesNotMatch(source, /private setRuleValue/);
  assert.doesNotMatch(source, /DYNAMIC_GLOBAL_KEYS/);
});
