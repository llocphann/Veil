import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  continuousControlPatch,
  controlCanFrameCoalesce,
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

const settingsBaseSource = fs.readFileSync(
  new URL("../src/settings-tab-base.ts", import.meta.url),
  "utf8",
);
const mainSource = fs.readFileSync(
  new URL("../src/main.ts", import.meta.url),
  "utf8",
);

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
  assert.equal(ruleControlRequiresRender("matchType"), true);
  assert.equal(ruleControlRequiresRender("profileId"), true);
  assert.equal(ruleControlRequiresRender("enabled"), false);
  assert.equal(ruleControlRequiresRender("excludePaneSurface"), false);
  assert.equal(ruleControlRequiresRender("excludePaneContent"), false);
  assert.equal(ruleControlRequiresRender("matchValue"), false);
});

void test("only continuous appearance sliders can frame-coalesce", () => {
  assert.equal(controlCanFrameCoalesce("opacity"), true);
  assert.equal(controlCanFrameCoalesce("wallpaperZoom"), true);
  assert.equal(controlCanFrameCoalesce("profile:scene-1:opacity"), true);
  assert.equal(controlCanFrameCoalesce("profile:scene-1:transitionDuration"), true);
  assert.equal(controlCanFrameCoalesce("enabled"), false);
  assert.equal(controlCanFrameCoalesce("wallpaperPoolEnabled"), false);
  assert.equal(controlCanFrameCoalesce("profile:scene-1:name"), false);
  assert.equal(controlCanFrameCoalesce("wallpaper-rule:wallpaper-1:matchValue"), false);
});

void test("continuous control values collapse into one immutable settings patch", () => {
  const settings = settingsFixture();
  const second = createProfile(settings.profiles, settings);
  second.id = "scene-2";
  second.name = "Rest";
  settings.profiles = [...settings.profiles, second];

  const firstProfile = settings.profiles[0];
  const secondProfile = settings.profiles[1];
  const patch = continuousControlPatch(settings, new Map<string, unknown>([
    ["opacity", 42],
    ["profile:scene-1:opacity", 35],
    ["profile:scene-1:wallpaperZoom", 125],
    ["profile:scene-1:name", "Ignored"],
  ]));

  assert.ok(patch);
  assert.equal(patch.opacity, 42);
  assert.ok(patch.profiles);
  assert.notEqual(patch.profiles, settings.profiles);
  assert.notEqual(patch.profiles[0], firstProfile);
  assert.equal(patch.profiles[0]?.opacity, 35);
  assert.equal(patch.profiles[0]?.wallpaperZoom, 125);
  assert.equal(patch.profiles[0]?.name, "Focus");
  assert.equal(patch.profiles[1], secondProfile);
  assert.equal(settings.opacity, DEFAULT_SETTINGS.opacity);
  assert.equal(firstProfile?.opacity, DEFAULT_SETTINGS.opacity);
});

void test("continuous patch returns null when every queued value is already current", () => {
  const settings = settingsFixture();
  assert.equal(
    continuousControlPatch(settings, new Map([
      ["opacity", settings.opacity],
      ["profile:scene-1:opacity", settings.profiles[0]?.opacity],
    ])),
    null,
  );
});

void test("settings base delegates control-model ownership", () => {
  assert.match(settingsBaseSource, /controlValue\(this\.plugin\.settings, key\)/);
  assert.match(settingsBaseSource, /parseProfileControlKey\(key\)/);
  assert.match(settingsBaseSource, /parseRuleControlKey\(key\)/);
  assert.match(settingsBaseSource, /setRuleControlValue\(/);
  assert.doesNotMatch(settingsBaseSource, /private parseProfileKey/);
  assert.doesNotMatch(settingsBaseSource, /private parseRuleKey/);
  assert.doesNotMatch(settingsBaseSource, /private setRuleValue/);
  assert.doesNotMatch(settingsBaseSource, /DYNAMIC_GLOBAL_KEYS/);
});

void test("settings controls send minimal immutable patches", () => {
  assert.ok(
    settingsBaseSource.includes("this.plugin.updateSettings({ [key]: value });"),
  );
  assert.doesNotMatch(settingsBaseSource, /normalizeSettings\(\{ \.\.\.this\.plugin\.settings/);
  assert.ok(settingsBaseSource.includes("const next = { ...rule };"));
  assert.ok(settingsBaseSource.includes("this.plugin.settings.wallpaperRules.map((rule) =>"));
  assert.ok(settingsBaseSource.includes("this.plugin.settings.opacityExclusions.map((rule) =>"));
});

void test("settings UI frame-coalesces only continuous controls", () => {
  assert.match(settingsBaseSource, /new SettingsControlFrameQueue\(/);
  assert.match(settingsBaseSource, /ownerDocument\.defaultView/);
  assert.match(
    settingsBaseSource,
    /return this\.continuousControls\.value\([\s\S]*?controlValue\(this\.plugin\.settings, key\)/,
  );

  const setter = settingsBaseSource.match(
    /setControlValue\(key: string, value: unknown\): void \{[\s\S]*?\n {2}\}/,
  )?.[0] || "";
  const queueIndex = setter.indexOf("if (controlCanFrameCoalesce(key))");
  const flushIndex = setter.indexOf("this.continuousControls.flush();");
  const applyIndex = setter.indexOf("this.applyControlValue(key, value);");
  assert.ok(queueIndex >= 0);
  assert.ok(flushIndex > queueIndex);
  assert.ok(applyIndex > flushIndex);
  assert.match(setter, /this\.continuousControls\.queue\(key, value\);/);
});

void test("one frame batch emits one settings update and hide flushes before persistence", () => {
  const applyBody = settingsBaseSource.match(
    /private applyContinuousControlValues\([\s\S]*?\n {2}\}/,
  )?.[0] || "";
  assert.match(applyBody, /continuousControlPatch\(this\.plugin\.settings, values\)/);
  assert.equal(
    (applyBody.match(/this\.plugin\.updateSettings\(patch\)/g) || []).length,
    1,
  );

  const hideBody = settingsBaseSource.match(/hide\(\): void \{[\s\S]*?\n {2}\}/)?.[0] || "";
  const flushIndex = hideBody.indexOf("this.flushControlUpdates();");
  const persistIndex = hideBody.indexOf("this.plugin.flushSettings()");
  assert.ok(flushIndex >= 0 && persistIndex > flushIndex);
});

void test("plugin unload flushes the final control frame before disabling updates", () => {
  const unloadBody = mainSource.match(/onunload\(\): void \{[\s\S]*?\n {2}\}/)?.[0] || "";
  const flushIndex = unloadBody.indexOf("this.settingTab?.flushControlUpdates();");
  const unloadIndex = unloadBody.indexOf("this.unloaded = true;");
  const persistIndex = unloadBody.indexOf("this.flushSettings()");
  assert.ok(flushIndex >= 0);
  assert.ok(unloadIndex > flushIndex);
  assert.ok(persistIndex > unloadIndex);
});
