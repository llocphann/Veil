import assert from "node:assert/strict";
import test from "node:test";
import { wallpaperMediaIdentityKey } from "../src/wallpaper-media-identity";

const base = {
  path: "Wallpapers/a.webp",
  url: "app://vault/Wallpapers/a.webp",
  modifiedAt: 100,
  size: 200,
  revision: 0,
};

void test("media identity stays stable across context and appearance changes", () => {
  const first = wallpaperMediaIdentityKey(base);
  const second = wallpaperMediaIdentityKey({ ...base });
  assert.equal(first, second);
});

void test("media identity changes only for media source changes or explicit reload", () => {
  const baseline = wallpaperMediaIdentityKey(base);
  assert.notEqual(baseline, wallpaperMediaIdentityKey({ ...base, path: "Wallpapers/b.webp" }));
  assert.notEqual(baseline, wallpaperMediaIdentityKey({ ...base, url: "app://vault/changed" }));
  assert.notEqual(baseline, wallpaperMediaIdentityKey({ ...base, modifiedAt: 101 }));
  assert.notEqual(baseline, wallpaperMediaIdentityKey({ ...base, size: 201 }));
  assert.notEqual(baseline, wallpaperMediaIdentityKey({ ...base, revision: 1 }));
});
