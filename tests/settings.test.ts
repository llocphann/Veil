import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  createProfile,
  mediaKind,
  normalizeSettings,
  normalizeWallpaperPath,
} from "../src/settings";

void test("fresh installs start without vault-specific appearance state", () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.equal(DEFAULT_SETTINGS.wallpaperPath, "");
  assert.equal(DEFAULT_SETTINGS.wallpaperPoolEnabled, false);
  assert.equal(DEFAULT_SETTINGS.wallpaperPoolIncludeSubfolders, false);
  assert.equal(DEFAULT_SETTINGS.wallpaperPositionX, 50);
  assert.equal(DEFAULT_SETTINGS.wallpaperPositionY, 50);
  assert.equal(DEFAULT_SETTINGS.wallpaperZoom, 100);
  assert.equal(DEFAULT_SETTINGS.transitionDuration, 320);
  assert.equal(DEFAULT_SETTINGS.opacity, 15);
  assert.equal(DEFAULT_SETTINGS.paneOpacity, 70);
  assert.equal(DEFAULT_SETTINGS.paneContentOpacity, 100);
  assert.equal(DEFAULT_SETTINGS.vignetteMode, "off");
  assert.deepEqual(DEFAULT_SETTINGS.profiles, []);
  assert.deepEqual(DEFAULT_SETTINGS.wallpaperRules, []);
  assert.deepEqual(DEFAULT_SETTINGS.opacityExclusions, []);
});

void test("settings use bounded numbers and allowed enum values", () => {
  const settings = normalizeSettings({
    wallpaperPoolEnabled: "true",
    wallpaperPoolIncludeSubfolders: true,
    wallpaperPositionX: -20,
    wallpaperPositionY: 180,
    wallpaperZoom: 999,
    transitionDuration: 9999,
    opacity: -10,
    paneOpacity: 180,
    paneContentOpacity: 180,
    blurIntensity: 300,
    vignetteIntensity: "80",
    vignetteRadius: Number.NaN,
    dimIntensity: Number.POSITIVE_INFINITY,
    colorOverlayOpacity: 999,
    effectIntensity: -10,
    colorOverlayColor: "url(https://example.com/tracker.png)",
    colorOverlayBlendMode: "unsafe",
    effectPreset: "expensive-loop",
    displayMode: "url(unsafe)",
    vignetteMode: "bad",
    enabled: "false",
  });
  assert.equal(settings.wallpaperPoolEnabled, false);
  assert.equal(settings.wallpaperPoolIncludeSubfolders, true);
  assert.equal(settings.wallpaperPositionX, 0);
  assert.equal(settings.wallpaperPositionY, 100);
  assert.equal(settings.wallpaperZoom, 200);
  assert.equal(settings.transitionDuration, 2000);
  assert.equal(settings.opacity, 0);
  assert.equal(settings.paneOpacity, 100);
  assert.equal(settings.paneContentOpacity, 100);
  assert.equal(settings.blurIntensity, 40);
  assert.equal(settings.vignetteIntensity, 80);
  assert.equal(settings.vignetteRadius, DEFAULT_SETTINGS.vignetteRadius);
  assert.equal(settings.dimIntensity, DEFAULT_SETTINGS.dimIntensity);
  assert.equal(settings.colorOverlayOpacity, 100);
  assert.equal(settings.effectIntensity, 0);
  assert.equal(settings.colorOverlayColor, DEFAULT_SETTINGS.colorOverlayColor);
  assert.equal(settings.colorOverlayBlendMode, DEFAULT_SETTINGS.colorOverlayBlendMode);
  assert.equal(settings.effectPreset, "none");
  assert.equal(settings.displayMode, "cover");
  assert.equal(settings.vignetteMode, "off");
  assert.equal(settings.enabled, true);
});

void test("zero values and disabled toggles survive loading", () => {
  const settings = normalizeSettings({
    wallpaperPoolEnabled: false,
    wallpaperPoolIncludeSubfolders: false,
    wallpaperPositionX: 0,
    wallpaperPositionY: 0,
    transitionDuration: 0,
    opacity: 0,
    paneOpacity: 0,
    paneContentOpacity: 0,
    blurIntensity: 0,
    vignetteIntensity: 0,
    vignetteRadius: 0,
    dimIntensity: 0,
    enabled: false,
    pauseWhenHidden: false,
    respectReducedMotion: false,
  });
  for (const key of [
    "wallpaperPositionX",
    "wallpaperPositionY",
    "transitionDuration",
    "opacity",
    "paneOpacity",
    "paneContentOpacity",
    "blurIntensity",
    "vignetteIntensity",
    "vignetteRadius",
    "dimIntensity",
  ] as const) {
    assert.equal(settings[key], 0);
  }
  assert.equal(settings.wallpaperZoom, 100);
  assert.equal(settings.wallpaperPoolEnabled, false);
  assert.equal(settings.wallpaperPoolIncludeSubfolders, false);
  assert.equal(settings.enabled, false);
  assert.equal(settings.pauseWhenHidden, false);
  assert.equal(settings.respectReducedMotion, false);
});

void test("older data keeps its values and receives neutral framing and pool defaults", () => {
  const settings = normalizeSettings({
    opacity: 65,
    paneOpacity: 35,
    wallpaperPath: "Media/scene.gif",
  });
  assert.equal(settings.opacity, 65);
  assert.equal(settings.paneOpacity, 35);
  assert.equal(settings.wallpaperPath, "Media/scene.gif");
  assert.equal(settings.wallpaperPoolEnabled, false);
  assert.equal(settings.wallpaperPoolIncludeSubfolders, false);
  assert.equal(settings.wallpaperPositionX, 50);
  assert.equal(settings.wallpaperPositionY, 50);
  assert.equal(settings.wallpaperZoom, 100);
  assert.equal(settings.transitionDuration, 320);
  assert.equal(settings.paneContentOpacity, 100);
  assert.deepEqual(settings.profiles, []);
});

void test("full-path wikilinks and Windows separators are normalized", () => {
  assert.equal(
    normalizeWallpaperPath(" ![[Media/Wallpaper.gif|preview]] "),
    "Media/Wallpaper.gif",
  );
  assert.equal(normalizeWallpaperPath(".\\Media\\Wallpaper.webm"), "Media/Wallpaper.webm");
  assert.equal(normalizeWallpaperPath(""), "");
});

void test("all five sizing modes are accepted", () => {
  for (const displayMode of ["cover", "contain", "none", "fill", "scale-down"] as const) {
    assert.equal(normalizeSettings({ displayMode }).displayMode, displayMode);
  }
});

void test("media detection is case insensitive and rejects unknown files", () => {
  for (const extension of ["GIF", "png", "jpg", "webp", "svg", "avif"]) {
    assert.equal(mediaKind({ extension }), "image");
  }
  for (const extension of ["MP4", "webm", "ogv", "mov", "m4v"]) {
    assert.equal(mediaKind({ extension }), "video");
  }
  assert.equal(mediaKind({ extension: "md" }), "");
  assert.equal(mediaKind(null), "");
});

void test("profiles and context rules normalize without losing order or compatibility", () => {
  const settings = normalizeSettings({
    profiles: [
      {
        id: "focus",
        name: "Focus",
        wallpaperPath: ".\\Media\\focus.webp",
        wallpaperPoolEnabled: true,
        wallpaperPoolIncludeSubfolders: true,
        wallpaperPositionX: -50,
        wallpaperPositionY: 140,
        wallpaperZoom: 240,
        transitionDuration: -20,
        opacity: 120,
        blurEnabled: true,
        blurIntensity: 80,
      },
    ],
    wallpaperRules: [
      {
        id: "same",
        enabled: true,
        matchType: "tag",
        matchValue: "#Media",
        profileId: "focus",
        wallpaperPath: ".\\Media\\legacy.webp",
      },
      {
        id: "same",
        enabled: true,
        matchType: "folder",
        matchValue: "20_Personal_Life/",
        profileId: "missing-profile",
        wallpaperPath: "Media/second.gif",
      },
    ],
    opacityExclusions: [
      {
        id: "opacity",
        enabled: true,
        matchType: "note",
        matchValue: "Homepage.md",
        excludePaneSurface: false,
        excludePaneContent: true,
      },
    ],
  });

  assert.equal(settings.profiles[0]?.wallpaperPath, "Media/focus.webp");
  assert.equal(settings.profiles[0]?.wallpaperPoolEnabled, true);
  assert.equal(settings.profiles[0]?.wallpaperPoolIncludeSubfolders, true);
  assert.equal(settings.profiles[0]?.wallpaperPositionX, 0);
  assert.equal(settings.profiles[0]?.wallpaperPositionY, 100);
  assert.equal(settings.profiles[0]?.wallpaperZoom, 200);
  assert.equal(settings.profiles[0]?.transitionDuration, 0);
  assert.equal(settings.profiles[0]?.opacity, 100);
  assert.equal(settings.profiles[0]?.blurIntensity, 40);
  assert.deepEqual(settings.wallpaperRules.map((rule) => rule.id), ["same", "same-2"]);
  assert.equal(settings.wallpaperRules[0]?.matchValue, "Media");
  assert.equal(settings.wallpaperRules[0]?.profileId, "focus");
  assert.equal(settings.wallpaperRules[0]?.wallpaperPath, "Media/legacy.webp");
  assert.equal(settings.wallpaperRules[1]?.matchValue, "20_Personal_Life");
  assert.equal(settings.wallpaperRules[1]?.profileId, "");
  assert.equal(settings.opacityExclusions[0]?.matchValue, "Homepage");
  assert.equal(settings.opacityExclusions[0]?.excludePaneSurface, false);
  assert.equal(settings.opacityExclusions[0]?.excludePaneContent, true);
});

void test("new scenes copy the complete current global appearance", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/default.webp",
    wallpaperPoolEnabled: true,
    wallpaperPoolIncludeSubfolders: true,
    wallpaperPositionX: 28,
    wallpaperPositionY: 73,
    wallpaperZoom: 135,
    transitionDuration: 480,
    opacity: 61,
    paneOpacity: 47,
    blurEnabled: true,
    blurIntensity: 11,
    effectPreset: "retro",
    effectIntensity: 32,
    pauseWhenHidden: false,
  });
  const profile = createProfile([], settings);

  assert.equal(profile.name, "Scene 1");
  assert.equal(profile.wallpaperPath, "Media/default.webp");
  assert.equal(profile.wallpaperPoolEnabled, true);
  assert.equal(profile.wallpaperPoolIncludeSubfolders, true);
  assert.equal(profile.wallpaperPositionX, 28);
  assert.equal(profile.wallpaperPositionY, 73);
  assert.equal(profile.wallpaperZoom, 135);
  assert.equal(profile.transitionDuration, 480);
  assert.equal(profile.opacity, 61);
  assert.equal(profile.paneOpacity, 47);
  assert.equal(profile.blurEnabled, true);
  assert.equal(profile.blurIntensity, 11);
  assert.equal(profile.effectPreset, "retro");
  assert.equal(profile.effectIntensity, 32);
  assert.equal(profile.pauseWhenHidden, false);
});
