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

void test("appearance changes stay idle while Veil remains disabled", () => {
  const previous = { ...settings(), enabled: false };
  const next = { ...previous, opacity: previous.opacity + 1 };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.globalAppearance, true);
  assert.equal(impact.documentResolution, false);
  assert.equal(impact.routingSchedule, false);
});

void test("scene name changes reconcile scenes without invalidating pool or timer", () => {
  const previous = settings();
  previous.profiles = [{
    ...previous,
    id: "scene-a",
    name: "A",
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

void test("pool folder and interval changes are explicit pool runtime changes", () => {
  const previous = { ...settings(), wallpaperPoolEnabled: true };
  const folder = classifySettingsChange(previous, {
    ...previous,
    wallpaperPoolFolder: "Wallpapers/Focus",
  });
  const interval = classifySettingsChange(previous, {
    ...previous,
    wallpaperPoolChangeInterval: 15,
  });

  assert.equal(folder.poolRuntime, true);
  assert.equal(interval.poolRuntime, true);
  assert.equal(folder.libraryRecent, false);
  assert.equal(interval.libraryRecent, false);
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

void test("wallpaper path changes are tracked for recent history but not pool topology", () => {
  const previous = settings();
  const next = { ...previous, wallpaperPath: "Wallpapers/new.webp" };
  const impact = classifySettingsChange(previous, next);

  assert.equal(impact.libraryRecent, true);
  assert.equal(impact.poolRuntime, false);
  assert.equal(impact.documentResolution, true);
});
