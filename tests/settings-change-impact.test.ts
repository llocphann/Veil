import assert from "node:assert/strict";
import test from "node:test";
import { classifySettingsChange } from "../src/settings-change-impact";
import { DEFAULT_SETTINGS, type VeilSettings } from "../src/settings";

function settings(): VeilSettings {
  return {
    ...DEFAULT_SETTINGS,
    profiles: [],
    wallpaperRules: [],
    opacityExclusions: [],
  };
}

void test("appearance-only changes avoid scene, pool, and routing work", () => {
  const previous = settings();
  const next = { ...previous, opacity: previous.opacity + 1 };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.globalAppearance, true);
  assert.equal(impact.documentResolution, true);
  assert.equal(impact.sceneRuntime, false);
  assert.equal(impact.poolRuntime, false);
  assert.equal(impact.routingSchedule, false);
  assert.equal(impact.libraryRecent, false);
});

void test("scene name changes reconcile scenes without invalidating pool or timer", () => {
  const previous = settings();
  previous.profiles = [{
    id: "scene-a",
    name: "A",
    wallpaperPath: "Wallpapers/a.webp",
    wallpaperPoolEnabled: false,
    wallpaperPoolIncludeSubfolders: false,
    displayMode: previous.displayMode,
    wallpaperPositionX: previous.wallpaperPositionX,
    wallpaperPositionY: previous.wallpaperPositionY,
    wallpaperZoom: previous.wallpaperZoom,
    transitionDuration: previous.transitionDuration,
    opacity: previous.opacity,
    paneOpacity: previous.paneOpacity,
    paneContentOpacity: previous.paneContentOpacity,
    vignetteMode: previous.vignetteMode,
    vignetteIntensity: previous.vignetteIntensity,
    vignetteRadius: previous.vignetteRadius,
    blurEnabled: previous.blurEnabled,
    blurIntensity: previous.blurIntensity,
    dimEnabled: previous.dimEnabled,
    dimIntensity: previous.dimIntensity,
    colorOverlayEnabled: previous.colorOverlayEnabled,
    colorOverlayColor: previous.colorOverlayColor,
    colorOverlayOpacity: previous.colorOverlayOpacity,
    colorOverlayBlendMode: previous.colorOverlayBlendMode,
    effectPreset: previous.effectPreset,
    effectIntensity: previous.effectIntensity,
    pauseWhenHidden: previous.pauseWhenHidden,
    respectReducedMotion: previous.respectReducedMotion,
  }];
  const next = {
    ...previous,
    profiles: previous.profiles.map((profile) => ({ ...profile, name: "Renamed" })),
  };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.profiles, true);
  assert.equal(impact.sceneRuntime, true);
  assert.equal(impact.poolRuntime, false);
  assert.equal(impact.routingSchedule, false);
  assert.equal(impact.libraryRecent, false);
});

void test("pool configuration changes invalidate only the pool runtime plus documents", () => {
  const previous = settings();
  const next = { ...previous, wallpaperPoolEnabled: true };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.globalAppearance, true);
  assert.equal(impact.poolRuntime, true);
  assert.equal(impact.documentResolution, true);
  assert.equal(impact.sceneRuntime, false);
  assert.equal(impact.routingSchedule, false);
});

void test("routing changes reschedule system routing but opacity rules do not touch pools", () => {
  const previous = settings();
  const next: VeilSettings = {
    ...previous,
    opacityExclusions: [{
      id: "opacity-a",
      enabled: true,
      matchType: "path",
      matchValue: "Notes/A.md",
      excludePaneSurface: true,
      excludePaneContent: false,
    }],
  };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.opacityExclusions, true);
  assert.equal(impact.routingSchedule, true);
  assert.equal(impact.poolRuntime, false);
  assert.equal(impact.sceneRuntime, false);
  assert.equal(impact.documentResolution, true);
});

void test("wallpaper path changes are tracked for recent history", () => {
  const previous = settings();
  const next = { ...previous, wallpaperPath: "Wallpapers/new.webp" };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.libraryRecent, true);
  assert.equal(impact.poolRuntime, true);
  assert.equal(impact.documentResolution, true);
});
