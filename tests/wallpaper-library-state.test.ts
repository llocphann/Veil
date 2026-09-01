import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_FAVORITE_WALLPAPERS,
  MAX_RECENT_WALLPAPERS,
  normalizeWallpaperLibraryState,
  rememberRecentWallpaper,
  toggleFavoriteWallpaper,
} from "../src/wallpaper-library-state";

void test("wallpaper library state normalizes and deduplicates vault paths", () => {
  const state = normalizeWallpaperLibraryState({
    favorites: [".\\Media\\A.webp", "Media/A.webp", "", 42, "Media/B.gif"],
    recent: ["Media/B.gif", "Media/B.gif", "Media/A.webp"],
  });

  assert.deepEqual(state.favorites, ["Media/A.webp", "Media/B.gif"]);
  assert.deepEqual(state.recent, ["Media/B.gif", "Media/A.webp"]);
});

void test("recent wallpapers are moved to the front and capped", () => {
  let state = normalizeWallpaperLibraryState({
    recent: Array.from({ length: MAX_RECENT_WALLPAPERS }, (_, index) => `Media/${index}.webp`),
  });
  state = rememberRecentWallpaper(state, "Media/12.webp");
  assert.equal(state.recent[0], "Media/12.webp");
  assert.equal(state.recent.length, MAX_RECENT_WALLPAPERS);

  state = rememberRecentWallpaper(state, "Media/new.webp");
  assert.equal(state.recent[0], "Media/new.webp");
  assert.equal(state.recent.length, MAX_RECENT_WALLPAPERS);
});

void test("favorite wallpapers toggle cleanly and respect the cap", () => {
  let state = normalizeWallpaperLibraryState({
    favorites: Array.from({ length: MAX_FAVORITE_WALLPAPERS }, (_, index) => `Media/${index}.webp`),
  });
  state = toggleFavoriteWallpaper(state, "Media/new.webp");
  assert.equal(state.favorites[0], "Media/new.webp");
  assert.equal(state.favorites.length, MAX_FAVORITE_WALLPAPERS);

  state = toggleFavoriteWallpaper(state, "Media/new.webp");
  assert.equal(state.favorites.includes("Media/new.webp"), false);
});
