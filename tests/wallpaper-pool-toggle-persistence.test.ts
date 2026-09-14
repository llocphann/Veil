import assert from "node:assert/strict";
import test from "node:test";
import { persistedVeilDataSnapshot } from "../src/persisted-data-schema";
import { classifySettingsChange } from "../src/settings-change-impact";
import { normalizeSettingsPatch } from "../src/settings-patch-normalization";
import {
  DEFAULT_SETTINGS,
  type VeilSettings,
} from "../src/settings";

function settingsFixture(): VeilSettings {
  return {
    ...(DEFAULT_SETTINGS as VeilSettings),
    wallpaperPath: "Media/Wallpapers/keep-me.webp",
    wallpaperPoolEnabled: false,
    profiles: [],
    wallpaperRules: [],
    opacityExclusions: [],
  };
}

void test("toggling wallpaper pool preserves the selected wallpaper path", () => {
  const initial = settingsFixture();
  const enabled = normalizeSettingsPatch(initial, { wallpaperPoolEnabled: true });
  const disabled = normalizeSettingsPatch(enabled, { wallpaperPoolEnabled: false });

  assert.equal(enabled.wallpaperPath, initial.wallpaperPath);
  assert.equal(disabled.wallpaperPath, initial.wallpaperPath);
  assert.equal(enabled.profiles, initial.profiles);
  assert.equal(enabled.wallpaperRules, initial.wallpaperRules);
  assert.equal(enabled.opacityExclusions, initial.opacityExclusions);
});

void test("pool-only toggles do not count as Wallpaper Library recent changes", () => {
  const initial = settingsFixture();
  const enabled = normalizeSettingsPatch(initial, { wallpaperPoolEnabled: true });
  const disabled = normalizeSettingsPatch(enabled, { wallpaperPoolEnabled: false });

  assert.equal(classifySettingsChange(initial, enabled).libraryRecent, false);
  assert.equal(classifySettingsChange(enabled, disabled).libraryRecent, false);
});

void test("persisted snapshots retain wallpaper path and Wallpaper Library state while pool is enabled", () => {
  const enabled = normalizeSettingsPatch(settingsFixture(), { wallpaperPoolEnabled: true });
  const library = {
    favorites: ["Media/Wallpapers/favorite.webp"],
    recent: ["Media/Wallpapers/recent.webp"],
  };
  const snapshot = persistedVeilDataSnapshot(enabled, library);

  assert.equal(snapshot.wallpaperPath, "Media/Wallpapers/keep-me.webp");
  assert.equal(snapshot.wallpaperPoolEnabled, true);
  assert.deepEqual(snapshot.wallpaperLibrary, library);
  assert.notEqual(snapshot.wallpaperLibrary, library);
});
