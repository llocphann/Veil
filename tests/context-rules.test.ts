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
  properties: {
    veil: "Cinema",
    rating: 5,
    published: true,
    mood: ["Focus", "Dark"],
  },
  theme: "dark",
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

void test("property rules support existence, scalar, boolean, numeric, and array values", () => {
  assert.equal(contextMatches(wallpaperRule("property", "veil"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "VEIL=cinema"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "rating=5"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "published=true"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "mood=focus"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "mood=calm"), context), false);
  assert.equal(contextMatches(wallpaperRule("property", "missing"), context), false);
});

void test("system theme rules match light or dark mode without requiring a note", () => {
  assert.equal(contextMatches(wallpaperRule("property", "@theme=dark"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "@theme=light"), context), false);
  assert.equal(
    contextMatches(wallpaperRule("property", "@theme=light"), {
      ...context,
      theme: "light",
    }),
    true,
  );
  assert.equal(
    contextMatches(wallpaperRule("property", "@theme=dark"), {
      ...context,
      properties: { "@theme": "light" },
    }),
    true,
  );
});

void test("normal note context wins before theme fallback regardless of rule order", () => {
  const rules = [
    wallpaperRule("property", "@theme=dark", "Media/dark.webp"),
    wallpaperRule("tag", "media", "Media/media.webp"),
  ];
  assert.equal(matchingWallpaperRule(rules, context)?.wallpaperPath, "Media/media.webp");

  const unmatched: NoteContext = {
    ...context,
    tags: [],
    properties: {},
  };
  assert.equal(matchingWallpaperRule(rules, unmatched)?.wallpaperPath, "Media/dark.webp");
});

void test("the first matching wallpaper rule wins within the same priority tier", () => {
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
