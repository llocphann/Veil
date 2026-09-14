import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../src/settings";
import {
  rewriteWallpaperPoolSelectionPaths,
  rewriteWallpaperPoolSelectionsForRename,
  staleWallpaperPoolCandidateCacheKeys,
  wallpaperPoolChangeIntervalForContext,
  wallpaperPoolConfiguration,
  wallpaperPoolConfigurationChanged,
  wallpaperPoolConfigurationChanges,
  wallpaperPoolSelectionConfigurationChanges,
} from "../src/wallpaper-pool-config";

function fixture() {
  return normalizeSettings({
    wallpaperPath: "Media/default.webp",
    wallpaperPoolEnabled: true,
    wallpaperPoolFolder: "Media",
    wallpaperPoolIncludeSubfolders: false,
    wallpaperPoolChangeInterval: 10,
    opacity: 15,
    profiles: [
      {
        id: "focus",
        name: "Focus",
        wallpaperPath: "Media/Focus/focus.webp",
        wallpaperPoolEnabled: true,
        wallpaperPoolFolder: "Media/Focus",
        wallpaperPoolIncludeSubfolders: true,
        wallpaperPoolChangeInterval: 20,
        opacity: 40,
      },
      {
        id: "reading",
        name: "Reading",
        wallpaperPath: "Media/Reading/read.webp",
        wallpaperPoolEnabled: false,
        wallpaperPoolFolder: "Media/Reading",
      },
    ],
  });
}

void test("pool configuration ignores appearance-only and hidden wallpaper-file changes", () => {
  const previous = fixture();
  const next = normalizeSettings({
    ...previous,
    wallpaperPath: "Elsewhere/fallback.webp",
    opacity: 67,
    blurEnabled: true,
    profiles: previous.profiles.map((profile) =>
      profile.id === "focus"
        ? { ...profile, wallpaperPath: "Elsewhere/focus-fallback.webp", opacity: 75 }
        : profile,
    ),
  });

  assert.equal(wallpaperPoolConfigurationChanged(previous, next), false);
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, next), []);
});

void test("pool topology follows explicit folder and recursive scope", () => {
  const previous = fixture();
  assert.deepEqual(
    wallpaperPoolConfigurationChanges(previous, normalizeSettings({
      ...previous,
      wallpaperPoolFolder: "Other",
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

void test("interval changes reschedule a pool without invalidating its selection topology", () => {
  const previous = fixture();
  const next = normalizeSettings({ ...previous, wallpaperPoolChangeInterval: 30 });

  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, next), ["default"]);
  assert.deepEqual(wallpaperPoolSelectionConfigurationChanges(previous, next), []);
  assert.equal(wallpaperPoolChangeIntervalForContext(next, "default"), 30);
  assert.equal(wallpaperPoolChangeIntervalForContext(next, "profile:focus"), 20);
  assert.equal(wallpaperPoolChangeIntervalForContext(next, "profile:reading"), 0);
});

void test("changing one scene folder does not invalidate unrelated scene selections", () => {
  const previous = fixture();
  const next = normalizeSettings({
    ...previous,
    profiles: previous.profiles.map((profile) =>
      profile.id === "focus"
        ? { ...profile, wallpaperPoolFolder: "Other/Focus" }
        : profile,
    ),
  });
  assert.deepEqual(wallpaperPoolSelectionConfigurationChanges(previous, next), ["profile:focus"]);
});

void test("candidate cache eviction keeps reusable folder scans", () => {
  const previous = fixture();
  const sameFolder = normalizeSettings({ ...previous, wallpaperPath: "Media/alternate.webp" });
  assert.deepEqual(staleWallpaperPoolCandidateCacheKeys(previous, sameFolder), []);

  const movedFolder = normalizeSettings({
    ...previous,
    profiles: previous.profiles.map((profile) =>
      profile.id === "focus"
        ? { ...profile, wallpaperPoolFolder: "Other/Focus" }
        : profile,
    ),
  });
  assert.deepEqual(
    staleWallpaperPoolCandidateCacheKeys(previous, movedFolder),
    ["Media/Focus|recursive"],
  );
});

void test("scene reordering does not invalidate stable pool selections", () => {
  const previous = fixture();
  const next = normalizeSettings({ ...previous, profiles: [...previous.profiles].reverse() });
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, next), []);
  assert.deepEqual(
    wallpaperPoolConfiguration(previous).map((entry) => entry.id),
    ["default", "profile:focus", "profile:reading"],
  );
});

void test("adding or removing a scene invalidates only that scene pool state", () => {
  const previous = fixture();
  const removed = normalizeSettings({ ...previous, profiles: previous.profiles.slice(0, 1) });
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, removed), ["profile:reading"]);

  const added = normalizeSettings({
    ...previous,
    profiles: [
      ...previous.profiles,
      {
        id: "cinema",
        name: "Cinema",
        wallpaperPath: "Media/Cinema/cinema.webp",
        wallpaperPoolEnabled: true,
        wallpaperPoolFolder: "Media/Cinema",
      },
    ],
  });
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, added), ["profile:cinema"]);
});

void test("renaming selected pool media preserves current selection path state", () => {
  const selections = new Map([
    ["default|Media|direct", "Media/current.webp"],
    ["profile:focus|Media/Focus|recursive", "Media/Focus/old.webp"],
  ]);
  const rewrite = (path: string): string =>
    path === "Media/Focus/old.webp" ? "Media/Focus/renamed.webp" : path;

  assert.equal(rewriteWallpaperPoolSelectionPaths(selections, rewrite), true);
  assert.equal(
    selections.get("profile:focus|Media/Focus|recursive"),
    "Media/Focus/renamed.webp",
  );
});

void test("vault folder rename moves explicit pool selection key and selected path", () => {
  const previous = fixture();
  const oldPath = "Media/Focus";
  const newPath = "Wallpapers/Focus";
  const rewrite = (path: string): string =>
    path === oldPath || path.startsWith(`${oldPath}/`)
      ? newPath + path.slice(oldPath.length)
      : path;
  const next = normalizeSettings({
    ...previous,
    profiles: previous.profiles.map((profile) =>
      profile.id === "focus"
        ? {
            ...profile,
            wallpaperPath: rewrite(profile.wallpaperPath),
            wallpaperPoolFolder: rewrite(profile.wallpaperPoolFolder),
          }
        : profile,
    ),
  });
  const selections = new Map([
    ["profile:focus|Media/Focus|recursive", "Media/Focus/Sub/selected.webp"],
  ]);

  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, next), ["profile:focus"]);
  assert.ok(
    rewriteWallpaperPoolSelectionsForRename(selections, previous, next, rewrite)
      .includes("profile:focus"),
  );
  assert.equal(selections.has("profile:focus|Media/Focus|recursive"), false);
  assert.equal(
    selections.get("profile:focus|Wallpapers/Focus|recursive"),
    "Wallpapers/Focus/Sub/selected.webp",
  );
});

void test("wallpaper-file rename or manual file change does not move an explicit pool", () => {
  const previous = fixture();
  const renamed = normalizeSettings({ ...previous, wallpaperPath: "Media/default-renamed.webp" });
  const manual = normalizeSettings({ ...previous, wallpaperPath: "Other/default.webp" });

  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, renamed), []);
  assert.deepEqual(wallpaperPoolConfigurationChanges(previous, manual), []);
});
