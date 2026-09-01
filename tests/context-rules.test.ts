import assert from "node:assert/strict";
import test from "node:test";
import {
  contextMatches,
  matchingOpacityExclusions,
  matchingWallpaperRule,
  type NoteContext,
} from "../src/context-rules";
import type { OpacityExclusionRule, WallpaperRule } from "../src/settings";

const context: NoteContext = {
  path: "20_Personal_Life/25_Media_Tracker/Movies/World War Z.md",
  name: "World War Z.md",
  basename: "World War Z",
  tags: ["#media/movie", "#favorite"],
};

function wallpaperRule(
  matchType: WallpaperRule["matchType"],
  matchValue: string,
  wallpaperPath = "Media/wallpaper.webp",
): WallpaperRule {
  return {
    id: `${matchType}-${matchValue}`,
    enabled: true,
    matchType,
    matchValue,
    profileId: "",
    wallpaperPath,
  };
}

void test("context rules match note names, exact paths, folders, and nested tags", () => {
  assert.equal(contextMatches(wallpaperRule("note", "world war z.md"), context), true);
  assert.equal(contextMatches(wallpaperRule("path", context.path), context), true);
  assert.equal(contextMatches(wallpaperRule("folder", "20_Personal_Life/25_Media_Tracker"), context), true);
  assert.equal(contextMatches(wallpaperRule("tag", "#media"), context), true);
  assert.equal(contextMatches(wallpaperRule("folder", "20_Personal_Life/Books"), context), false);
});

void test("the first matching wallpaper rule wins", () => {
  const rules = [
    wallpaperRule("tag", "media", "Media/first.webp"),
    wallpaperRule("note", "World War Z", "Media/second.webp"),
  ];
  assert.equal(matchingWallpaperRule(rules, context)?.wallpaperPath, "Media/first.webp");
});

void test("opacity exclusions combine independently", () => {
  const rules: OpacityExclusionRule[] = [
    {
      id: "surface",
      enabled: true,
      matchType: "folder",
      matchValue: "20_Personal_Life",
      excludePaneSurface: true,
      excludePaneContent: false,
    },
    {
      id: "content",
      enabled: true,
      matchType: "tag",
      matchValue: "favorite",
      excludePaneSurface: false,
      excludePaneContent: true,
    },
  ];
  assert.deepEqual(matchingOpacityExclusions(rules, context), {
    paneSurface: true,
    paneContent: true,
  });
});
