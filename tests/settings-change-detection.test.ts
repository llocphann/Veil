import assert from "node:assert/strict";
import test from "node:test";
import { veilSettingsEqual } from "../src/settings-change-detection";
import { DEFAULT_SETTINGS, type VeilSettings } from "../src/settings";

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
