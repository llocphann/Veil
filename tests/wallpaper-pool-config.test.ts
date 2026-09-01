import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../src/settings";
import {
  rewriteWallpaperPoolSelectionPaths,
  wallpaperPoolConfiguration,
  wallpaperPoolConfigurationChanged,
  wallpaperPoolConfigurationChanges,
} from "../src/wallpaper-pool-config";

function fixture() {
  return normalizeSettings({
    wallpaperPath: "Media/default.webp",
    wallpaperPoolEnabled: true,
    wallpaperPoolIncludeSubfolders: false,
    opacity: 15,
    profiles: [
      {
        id: "focus",
        name: "Focus",
        wallpaperPath: "Media/Focus/focus.webp",
        wallpaperPoolEnabled: true,
        wallpaperPoolIncludeSubfolders: true,
        opacity: 40,
      },
      {
        id: "reading",
        name: "Reading",
        wallpaperPath: "Media/Reading/read.webp",
        wallpaperPoolEnabled: false,
      },
    ],
  });
}

void test("pool configuration ignores appearance-only changes", () => {
  const previous = fixture();
  const next = normalizeSettings({
    ...previous,
    opacity: 67,
    blurEnabled: true,
    blurIntensity: 12,
    profiles: previous.profiles.map((profile) =>
      profile.id === "focus" ? { ...profile, opacity: 75, effectPreset: "retro" } : profile,
    ),
  });
  assert.equal(wallpaperPoolConfigurationChanged(previous, next), false);
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, next), []);
});

void test("pool configuration reports only the appearance whose pool topology changed", () => {
  const previous = fixture();
  assert.deepEqual(
    wallpaperPoolConfigurationChanges(previous, normalizeSettings({
      ...previous,
      wallpaperPath: "Media/other.webp",
    })),
    ["default"],
  );
  assert.deepEqual(
    wallpaperPoolConfigurationChanges(previous, normalizeSettings({
      ...previous,
      profiles: previous.profiles.map((profile) =>
        profile.id === "focus"
          ? { ...profile, wallpaperPoolIncludeSubfolders: false }
          : profile,
      ),
    })),
    ["profile:focus"],
  );
});

void test("changing one scene pool does not invalidate unrelated scene selections", () => {
  const previous = fixture();
  const next = normalizeSettings({
    ...previous,
    profiles: previous.profiles.map((profile) =>
      profile.id === "focus"
        ? { ...profile, wallpaperPath: "Media/Focus/alternate.webp" }
        : profile,
    ),
  });
  const changes = wallpaperPoolConfigurationChanges(previous, next);
  assert.deepEqual(changes, ["profile:focus"]);
  assert.equal(changes.includes("profile:reading"), false);
  assert.equal(changes.includes("default"), false);
});

void test("scene reordering does not invalidate stable pool selections", () => {
  const previous = fixture();
  const next = normalizeSettings({
    ...previous,
    profiles: [...previous.profiles].reverse(),
  });
  assert.equal(wallpaperPoolConfigurationChanged(previous, next), false);
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, next), []);
  assert.deepEqual(
    wallpaperPoolConfiguration(previous).map((entry) => entry.id),
    ["default", "profile:focus", "profile:reading"],
  );
});

void test("adding or removing a scene invalidates only that scene pool state", () => {
  const previous = fixture();
  const removed = normalizeSettings({
    ...previous,
    profiles: previous.profiles.slice(0, 1),
  });
  assert.deepEqual(
    wallpaperPoolConfigurationChanges(previous, removed),
    ["profile:reading"],
  );

  const added = normalizeSettings({
    ...previous,
    profiles: [
      ...previous.profiles,
      {
        id: "cinema",
        name: "Cinema",
        wallpaperPath: "Media/Cinema/cinema.webp",
        wallpaperPoolEnabled: true,
      },
    ],
  });
  assert.deepEqual(
    wallpaperPoolConfigurationChanges(previous, added),
    ["profile:cinema"],
  );
});

void test("renaming selected pool media preserves the current and previous selections", () => {
  const selections = new Map([
    ["default|Media|direct", "Media/current.webp"],
    ["profile:focus|Media/Focus|recursive", "Media/Focus/old.webp"],
    ["profile:reading|Media/Reading|direct", "Media/Reading/read.webp"],
  ]);
  const rewrite = (path: string): string =>
    path === "Media/Focus/old.webp" ? "Media/Focus/renamed.webp" : path;

  assert.equal(rewriteWallpaperPoolSelectionPaths(selections, rewrite), true);
  assert.equal(
    selections.get("profile:focus|Media/Focus|recursive"),
    "Media/Focus/renamed.webp",
  );
  assert.equal(selections.get("default|Media|direct"), "Media/current.webp");
  assert.equal(
    rewriteWallpaperPoolSelectionPaths(selections, rewrite),
    false,
  );
});

void test("renaming a pool folder rewrites descendant selection paths", () => {
  const selections = new Map([
    ["profile:focus|Media/Focus|recursive", "Media/Focus/Sub/selected.webp"],
  ]);
  const oldPath = "Media/Focus";
  const newPath = "Wallpapers/Focus";
  const rewrite = (path: string): string =>
    path === oldPath || path.startsWith(`${oldPath}/`)
      ? newPath + path.slice(oldPath.length)
      : path;

  assert.equal(rewriteWallpaperPoolSelectionPaths(selections, rewrite), true);
  assert.equal(
    selections.get("profile:focus|Media/Focus|recursive"),
    "Wallpapers/Focus/Sub/selected.webp",
  );
});
