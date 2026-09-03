import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  invalidatePoolCandidatesForVaultEvent,
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

void test("media invalidation only drops caches whose scope contains the changed path", () => {
  const candidates = new Map<string, string[]>([
    ["Wallpapers|direct", ["Wallpapers/a.png"]],
    ["Wallpapers|recursive", ["Wallpapers/a.png", "Wallpapers/Sub/b.png"]],
    ["Attachments|direct", ["Attachments/pasted.png"]],
    ["|direct", ["root.png"]],
    ["|recursive", ["root.png", "Attachments/pasted.png"]],
  ]);

  assert.equal(
    invalidatePoolCandidatesForVaultEvent(
      candidates,
      "create",
      "Attachments/new.png",
    ),
    2,
  );
  assert.deepEqual(
    Array.from(candidates.keys()).sort(),
    ["Wallpapers|direct", "Wallpapers|recursive", "|direct"].sort(),
  );
});

void test("nested media only invalidates recursive ancestors and its direct folder", () => {
  const candidates = new Map<string, string[]>([
    ["Wallpapers|direct", []],
    ["Wallpapers|recursive", []],
    ["Wallpapers/Sub|direct", []],
    ["Wallpapers/Sub|recursive", []],
    ["Other|recursive", []],
  ]);

  assert.equal(
    invalidatePoolCandidatesForVaultEvent(
      candidates,
      "delete",
      "Wallpapers/Sub/deleted.webp",
    ),
    3,
  );
  assert.deepEqual(
    Array.from(candidates.keys()).sort(),
    ["Wallpapers|direct", "Other|recursive"].sort(),
  );
});

void test("media rename invalidates both old and new pool scopes", () => {
  const candidates = new Map<string, string[]>([
    ["Wallpapers|direct", []],
    ["Attachments|direct", []],
    ["Other|direct", []],
  ]);

  assert.equal(
    invalidatePoolCandidatesForVaultEvent(
      candidates,
      "rename",
      "Attachments/moved.png",
      "Wallpapers/original.png",
    ),
    2,
  );
  assert.deepEqual(Array.from(candidates.keys()), ["Other|direct"]);
});

void test("folder topology only invalidates when it can remove or move candidates", () => {
  assert.equal(shouldInvalidatePoolCandidates("create", "Wallpapers/New", "", true), false);
  assert.equal(shouldInvalidatePoolCandidates("delete", "Wallpapers/Old", "", true), true);
  assert.equal(
    shouldInvalidatePoolCandidates("rename", "Wallpapers/New", "Wallpapers/Old", true),
    true,
  );

  const candidates = new Map<string, string[]>([
    ["Wallpapers|direct", []],
    ["Other|recursive", []],
  ]);
  assert.equal(
    invalidatePoolCandidatesForVaultEvent(candidates, "create", "Wallpapers/New", "", true),
    0,
  );
  assert.equal(candidates.size, 2);
  assert.equal(
    invalidatePoolCandidatesForVaultEvent(candidates, "rename", "Wallpapers/New", "Wallpapers/Old", true),
    2,
  );
  assert.equal(candidates.size, 0);
});

void test("vault handlers use scoped pool cache invalidation", () => {
  const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  for (const event of ["create", "delete", "rename"] as const) {
    assert.match(
      source,
      new RegExp(`invalidatePoolCandidatesForVaultEvent\\(\\s*this\\.poolCandidates,\\s*\\"${event}\\"`),
    );
  }
});
