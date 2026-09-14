import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../src/settings";
import {
  wallpaperLibraryTargetPatch,
  wallpaperLibraryTargets,
} from "../src/wallpaper-library-targets";

function settingsFixture() {
  return normalizeSettings({
    wallpaperPath: "Media/default.webp",
    profiles: [
      { id: "focus", name: "Focus", wallpaperPath: "Media/focus.webp" },
      { id: "cinema", name: "Cinema", wallpaperPath: "Media/cinema.webp" },
    ],
    wallpaperRules: [
      {
        id: "inline",
        enabled: true,
        matchType: "tag",
        matchValue: "project",
        profileId: "",
        wallpaperPath: "Media/project.webp",
      },
      {
        id: "scene-route",
        enabled: true,
        matchType: "tag",
        matchValue: "movie",
        profileId: "cinema",
        wallpaperPath: "Media/legacy.webp",
      },
    ],
  });
}

void test("library targets include default, scenes, and only legacy inline rules", () => {
  const targets = wallpaperLibraryTargets(settingsFixture());
  assert.deepEqual(
    targets.map((target) => [target.id, target.selectedPath]),
    [
      ["default", "Media/default.webp"],
      ["profile:focus", "Media/focus.webp"],
      ["profile:cinema", "Media/cinema.webp"],
      ["rule:inline", "Media/project.webp"],
    ],
  );
});

void test("applying to one scene preserves scene order and every other target", () => {
  const settings = settingsFixture();
  const patch = wallpaperLibraryTargetPatch(settings, "profile:focus", "Media/new-focus.webp");
  assert.ok(patch?.profiles);
  assert.deepEqual(patch.profiles.map((profile) => profile.id), ["focus", "cinema"]);
  assert.equal(patch.profiles[0]?.wallpaperPath, "Media/new-focus.webp");
  assert.equal(patch.profiles[1]?.wallpaperPath, "Media/cinema.webp");
  assert.equal(settings.wallpaperPath, "Media/default.webp");
  assert.equal(settings.wallpaperRules[0]?.wallpaperPath, "Media/project.webp");
});

void test("applying to an inline rule does not rewrite a scene-backed route", () => {
  const settings = settingsFixture();
  const patch = wallpaperLibraryTargetPatch(settings, "rule:inline", "Media/new-project.webp");
  assert.ok(patch?.wallpaperRules);
  assert.deepEqual(patch.wallpaperRules.map((rule) => rule.id), ["inline", "scene-route"]);
  assert.equal(patch.wallpaperRules[0]?.wallpaperPath, "Media/new-project.webp");
  assert.equal(patch.wallpaperRules[1]?.wallpaperPath, "Media/legacy.webp");
  assert.equal(wallpaperLibraryTargetPatch(settings, "rule:scene-route", "Media/nope.webp"), null);
});

void test("missing and malformed target ids fail closed", () => {
  const settings = settingsFixture();
  assert.equal(wallpaperLibraryTargetPatch(settings, "profile:missing", "Media/new.webp"), null);
  assert.equal(wallpaperLibraryTargetPatch(settings, "rule:missing", "Media/new.webp"), null);
  assert.equal(wallpaperLibraryTargetPatch(settings, "unknown", "Media/new.webp"), null);
});
