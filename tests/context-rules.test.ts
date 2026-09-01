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

void test("system fallbacks can resolve without an active note context", () => {
  const previousDocument = globalThis.document;
  try {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        body: {
          classList: {
            contains: (value: string) => value === "theme-dark",
          },
        },
      },
    });
    assert.equal(contextMatches(wallpaperRule("property", "@theme=dark"), null), true);
  } finally {
    if (previousDocument === undefined) delete (globalThis as { document?: unknown }).document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
  }
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

void test("full-day and wrapped day ranges preserve local-day semantics", () => {
  const fullDay = wallpaperRule("property", "@time=08:00-08:00");
  assert.equal(contextMatches(fullDay, { ...context, now: new Date(2026, 8, 1, 7, 59) }), true);
  assert.equal(contextMatches(fullDay, { ...context, now: new Date(2026, 8, 1, 18, 0) }), true);

  const wrappedDays = wallpaperRule("property", "@day=fri-mon");
  assert.equal(contextMatches(wrappedDays, { ...context, now: new Date(2026, 8, 4, 12, 0) }), true);
  assert.equal(contextMatches(wrappedDays, { ...context, now: new Date(2026, 8, 6, 12, 0) }), true);
  assert.equal(contextMatches(wrappedDays, { ...context, now: new Date(2026, 8, 7, 12, 0) }), true);
  assert.equal(contextMatches(wrappedDays, { ...context, now: new Date(2026, 8, 8, 12, 0) }), false);
});

void test("malformed system fallback expressions fail closed", () => {
  for (const value of [
    "@theme=blue",
    "@theme",
    "@time=25:00-06:00",
    "@time=22:00",
    "@day=funday",
    "@schedule=mon-fri",
    "@schedule=funday 08:00-18:00",
    "@unknown=value",
  ]) {
    assert.equal(contextMatches(wallpaperRule("property", value), context), false, value);
  }
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

void test("boundary scheduling chooses the earliest enabled meaningful transition", () => {
  const disabled = wallpaperRule("property", "@time=20:00-21:00");
  disabled.enabled = false;
  const rules = [
    disabled,
    wallpaperRule("property", "@theme=dark"),
    wallpaperRule("property", "@day=weekday"),
    wallpaperRule("property", "@time=22:00-06:00"),
  ];
  const now = new Date(2026, 8, 1, 21, 30);
  assert.equal(
    nextSystemContextBoundary(rules, now),
    new Date(2026, 8, 1, 22, 0).getTime(),
  );
  assert.equal(
    nextSystemContextBoundary([wallpaperRule("property", "@theme=dark")], now),
    null,
  );
  assert.equal(
    nextSystemContextBoundary([wallpaperRule("property", "@time=08:00-08:00")], now),
    null,
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

void test("system-context opacity exclusions remain additive", () => {
  const rules: OpacityExclusionRule[] = [
    {
      id: "night-surface",
      enabled: true,
      matchType: "property",
      matchValue: "@time=22:00-06:00",
      excludePaneSurface: true,
      excludePaneContent: false,
    },
    {
      id: "dark-content",
      enabled: true,
      matchType: "property",
      matchValue: "@theme=dark",
      excludePaneSurface: false,
      excludePaneContent: true,
    },
  ];
  assert.deepEqual(matchingOpacityExclusions(rules, context), {
    paneSurface: true,
    paneContent: true,
  });
});
