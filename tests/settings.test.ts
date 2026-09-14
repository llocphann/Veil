import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS,
  mediaKind,
  normalizeSettings,
  normalizeWallpaperPath,
} from "../src/settings";

void test("fresh installs start without a vault-specific wallpaper path", () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.equal(DEFAULT_SETTINGS.wallpaperPath, "");
  assert.equal(DEFAULT_SETTINGS.opacity, 15);
  assert.equal(DEFAULT_SETTINGS.paneOpacity, 70);
  assert.equal(DEFAULT_SETTINGS.paneContentOpacity, 100);
  assert.equal(DEFAULT_SETTINGS.vignetteMode, "off");
});

void test("settings use bounded numbers and allowed enum values", () => {
  const settings = normalizeSettings({
    opacity: -10,
    paneOpacity: 180,
    paneContentOpacity: 180,
    blurIntensity: 300,
    vignetteIntensity: "80",
    vignetteRadius: Number.NaN,
    dimIntensity: Number.POSITIVE_INFINITY,
    displayMode: "url(unsafe)",
    vignetteMode: "bad",
    enabled: "false",
  });
  assert.equal(settings.opacity, 0);
  assert.equal(settings.paneOpacity, 100);
  assert.equal(settings.paneContentOpacity, 100);
  assert.equal(settings.blurIntensity, 40);
  assert.equal(settings.vignetteIntensity, 80);
  assert.equal(settings.vignetteRadius, DEFAULT_SETTINGS.vignetteRadius);
  assert.equal(settings.dimIntensity, DEFAULT_SETTINGS.dimIntensity);
  assert.equal(settings.displayMode, "cover");
  assert.equal(settings.vignetteMode, "off");
  assert.equal(settings.enabled, true);
});

void test("zero values and disabled toggles survive loading", () => {
  const settings = normalizeSettings({
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
  assert.equal(settings.enabled, false);
  assert.equal(settings.pauseWhenHidden, false);
  assert.equal(settings.respectReducedMotion, false);
});

void test("older data keeps its values and does not opt in to whole-pane fading", () => {
  const settings = normalizeSettings({
    opacity: 65,
    paneOpacity: 35,
    wallpaperPath: "Media/scene.gif",
  });
  assert.equal(settings.opacity, 65);
  assert.equal(settings.paneOpacity, 35);
  assert.equal(settings.wallpaperPath, "Media/scene.gif");
  assert.equal(settings.paneContentOpacity, 100);
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
