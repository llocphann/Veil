import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { veilSettingsEqual } from "../src/settings-change-detection";
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

void test("settings no-op guard runs before runtime reconciliation and persistence", () => {
  const updateBody = mainSource.match(
    /public updateSettings\([\s\S]*?\n {2}public flushSettings\(/,
  )?.[0] || "";
  const guardIndex = updateBody.indexOf("if (veilSettingsEqual(previous, next)) return;");
  assert.ok(guardIndex >= 0);
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
