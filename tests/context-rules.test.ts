import assert from "node:assert/strict";
import test from "node:test";
import {
  contextMatches,
  matchingOpacityExclusions,
  matchingWallpaperRule,
  nextSystemContextBoundary,
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
  now: new Date(2026, 8, 1, 23, 30),
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

void test("system theme rules match light or dark mode without requiring frontmatter", () => {
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

void test("time, day, and schedule fallbacks use local time and support overnight ranges", () => {
  assert.equal(contextMatches(wallpaperRule("property", "@time=22:00-06:00"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "@time=06:00-22:00"), context), false);
  assert.equal(contextMatches(wallpaperRule("property", "@day=tue"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "@day=weekday"), context), true);
  assert.equal(contextMatches(wallpaperRule("property", "@day=weekend"), context), false);
  assert.equal(
    contextMatches(wallpaperRule("property", "@schedule=mon-fri 22:00-06:00"), context),
    true,
  );

  const saturdayMorning: NoteContext = {
    ...context,
    now: new Date(2026, 8, 5, 5, 30),
  };
  assert.equal(
    contextMatches(wallpaperRule("property", "@schedule=mon-fri 22:00-06:00"), saturdayMorning),
    true,
  );
  assert.equal(
    contextMatches(wallpaperRule("property", "@schedule=mon-fri 08:00-18:00"), saturdayMorning),
    false,
  );
});

void test("scheduled rules expose only their next meaningful boundary", () => {
  const timeRule = wallpaperRule("property", "@time=22:00-06:00");
  const timeNow = new Date(2026, 8, 1, 21, 30);
  assert.equal(
    nextSystemContextBoundary([timeRule], timeNow),
    new Date(2026, 8, 1, 22, 0).getTime(),
  );

  const scheduleRule = wallpaperRule("property", "@schedule=mon-fri 22:00-06:00");
  const scheduleNow = new Date(2026, 8, 1, 23, 30);
  assert.equal(
    nextSystemContextBoundary([scheduleRule], scheduleNow),
    new Date(2026, 8, 2, 6, 0).getTime(),
  );

  const dayRule = wallpaperRule("property", "@day=weekday");
  const fridayNight = new Date(2026, 8, 4, 23, 30);
  assert.equal(
    nextSystemContextBoundary([dayRule], fridayNight),
    new Date(2026, 8, 5, 0, 0).getTime(),
  );
});

void test("normal note context wins before system fallbacks regardless of rule order", () => {
  const rules = [
    wallpaperRule("property", "@theme=dark", "Media/dark.webp"),
    wallpaperRule("property", "@time=22:00-06:00", "Media/night.webp"),
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
