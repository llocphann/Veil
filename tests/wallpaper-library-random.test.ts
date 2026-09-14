import assert from "node:assert/strict";
import test from "node:test";
import { randomVisibleWallpaper } from "../src/wallpaper-library-random";

const files = [
  { path: "Wallpapers/a.webp" },
  { path: "Wallpapers/b.webp" },
  { path: "Wallpapers/c.webp" },
  { path: "Wallpapers/d.webp" },
];

void test("random wallpaper choice is limited to rendered visible items", () => {
  assert.equal(randomVisibleWallpaper(files, 2, "", () => 0)?.path, "Wallpapers/a.webp");
  assert.equal(randomVisibleWallpaper(files, 2, "", () => 0.999)?.path, "Wallpapers/b.webp");
});

void test("random wallpaper choice avoids the current item when possible", () => {
  assert.equal(
    randomVisibleWallpaper(files, 3, "Wallpapers/a.webp", () => 0)?.path,
    "Wallpapers/b.webp",
  );
  assert.equal(
    randomVisibleWallpaper(files, 1, "Wallpapers/a.webp", () => 0.5)?.path,
    "Wallpapers/a.webp",
  );
});

void test("random wallpaper choice handles empty or zero-sized visible sets", () => {
  assert.equal(randomVisibleWallpaper([], 60, "", () => 0), null);
  assert.equal(randomVisibleWallpaper(files, 0, "", () => 0), null);
});
