import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../src/settings";

void test("legacy global pools derive an explicit folder without changing the saved wallpaper", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/Wallpapers/legacy.webp",
    wallpaperPoolEnabled: true,
    wallpaperPoolIncludeSubfolders: true,
  });

  assert.equal(settings.wallpaperPath, "Media/Wallpapers/legacy.webp");
  assert.equal(settings.wallpaperPoolFolder, "Media/Wallpapers");
  assert.equal(settings.wallpaperPoolIncludeSubfolders, true);
  assert.equal(settings.wallpaperPoolChangeInterval, 30);
});

void test("legacy scene pools derive their own folder and keep scene wallpaper fallback data", () => {
  const settings = normalizeSettings({
    profiles: [{
      id: "focus",
      name: "Focus",
      wallpaperPath: "Media/Focus/legacy.webp",
      wallpaperPoolEnabled: true,
      wallpaperPoolIncludeSubfolders: false,
    }],
  });
  const scene = settings.profiles[0];
  assert.ok(scene);
  assert.equal(scene.wallpaperPath, "Media/Focus/legacy.webp");
  assert.equal(scene.wallpaperPoolFolder, "Media/Focus");
  assert.equal(scene.wallpaperPoolChangeInterval, 30);
});

void test("an explicitly selected vault-root pool is not replaced by the wallpaper file folder", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/Wallpapers/fallback.webp",
    wallpaperPoolEnabled: true,
    wallpaperPoolFolder: "",
  });

  assert.equal(settings.wallpaperPoolFolder, "");
  assert.equal(settings.wallpaperPath, "Media/Wallpapers/fallback.webp");
});
