import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  shouldInvalidatePoolCandidates,
  wallpaperMediaPath,
} from "../src/pool-cache-invalidation";

void test("detects supported wallpaper media paths", () => {
  assert.equal(wallpaperMediaPath("Wallpapers/scene.PNG"), true);
  assert.equal(wallpaperMediaPath("Wallpapers/animated.GIF"), true);
  assert.equal(wallpaperMediaPath("Wallpapers/clip.webm"), true);
  assert.equal(wallpaperMediaPath("Wallpapers/clip.MOV"), true);
  assert.equal(wallpaperMediaPath("Notes/scene.md"), false);
  assert.equal(wallpaperMediaPath("Assets/manual.pdf"), false);
  assert.equal(wallpaperMediaPath("Wallpapers/no-extension"), false);
  assert.equal(wallpaperMediaPath("Wallpapers/.png"), false);
});

void test("ordinary file churn does not invalidate wallpaper pool candidates", () => {
  assert.equal(shouldInvalidatePoolCandidates("create", "Notes/new.md"), false);
  assert.equal(shouldInvalidatePoolCandidates("delete", "Notes/old.md"), false);
  assert.equal(
    shouldInvalidatePoolCandidates("rename", "Notes/new-name.md", "Notes/old-name.md"),
    false,
  );
});

void test("media changes invalidate wallpaper pool candidates", () => {
  assert.equal(shouldInvalidatePoolCandidates("create", "Wallpapers/new.webp"), true);
  assert.equal(shouldInvalidatePoolCandidates("delete", "Wallpapers/old.mp4"), true);
  assert.equal(
    shouldInvalidatePoolCandidates("rename", "Notes/converted.md", "Wallpapers/old.png"),
    true,
  );
  assert.equal(
    shouldInvalidatePoolCandidates("rename", "Wallpapers/converted.png", "Notes/old.md"),
    true,
  );
});

void test("folder topology only invalidates when it can remove or move candidates", () => {
  assert.equal(shouldInvalidatePoolCandidates("create", "Wallpapers/New", "", true), false);
  assert.equal(shouldInvalidatePoolCandidates("delete", "Wallpapers/Old", "", true), true);
  assert.equal(
    shouldInvalidatePoolCandidates("rename", "Wallpapers/New", "Wallpapers/Old", true),
    true,
  );
});

void test("vault handlers use selective pool cache invalidation", () => {
  const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  for (const event of ["create", "delete", "rename"] as const) {
    assert.match(
      source,
      new RegExp(`shouldInvalidatePoolCandidates\\(\\"${event}\\"`),
    );
  }
});
