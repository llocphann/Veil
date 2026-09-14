import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSettings } from "../src/settings";
import { rewriteSettingsForVaultRename } from "../src/vault-settings-rename";

void test("vault rename rewrites configured wallpaper paths and path-based routing", () => {
  const original = normalizeSettings({
    wallpaperPath: "Media/Old/default.webp",
    profiles: [{
      id: "focus",
      name: "Focus",
      wallpaperPath: "Media/Old/scenes/focus.webp",
    }],
    wallpaperRules: [
      {
        id: "inline",
        enabled: true,
        matchType: "path",
        matchValue: "Media/Old/Note.md",
        wallpaperPath: "Media/Old/rules/path.webp",
      },
      {
        id: "folder",
        enabled: true,
        matchType: "folder",
        matchValue: "Media/Old/Projects",
        wallpaperPath: "Elsewhere/folder.webp",
      },
      {
        id: "tag",
        enabled: true,
        matchType: "tag",
        matchValue: "Media/Old",
        wallpaperPath: "Elsewhere/tag.webp",
      },
    ],
    opacityExclusions: [
      {
        id: "path-opacity",
        enabled: true,
        matchType: "path",
        matchValue: "Media/Old/Private.md",
        excludePaneSurface: true,
        excludePaneContent: false,
      },
      {
        id: "tag-opacity",
        enabled: true,
        matchType: "tag",
        matchValue: "Media/Old",
        excludePaneSurface: false,
        excludePaneContent: true,
      },
    ],
  });

  const result = rewriteSettingsForVaultRename(original, "Media/Old", "Media/New");

  assert.equal(result.changed, true);
  assert.equal(result.settings.wallpaperPath, "Media/New/default.webp");
  assert.equal(result.settings.profiles[0]?.wallpaperPath, "Media/New/scenes/focus.webp");
  assert.equal(result.settings.wallpaperRules[0]?.wallpaperPath, "Media/New/rules/path.webp");
  assert.equal(result.settings.wallpaperRules[0]?.matchValue, "Media/New/Note.md");
  assert.equal(result.settings.wallpaperRules[1]?.matchValue, "Media/New/Projects");
  assert.equal(result.settings.wallpaperRules[2]?.matchValue, "Media/Old");
  assert.equal(result.settings.opacityExclusions[0]?.matchValue, "Media/New/Private.md");
  assert.equal(result.settings.opacityExclusions[1]?.matchValue, "Media/Old");
});

void test("vault rename leaves unrelated settings unchanged", () => {
  const original = normalizeSettings({
    wallpaperPath: "Media/Current/default.webp",
    profiles: [{
      id: "focus",
      name: "Focus",
      wallpaperPath: "Media/Current/focus.webp",
    }],
    wallpaperRules: [{
      id: "project",
      enabled: true,
      matchType: "folder",
      matchValue: "Projects",
      wallpaperPath: "Media/Current/project.webp",
    }],
  });

  const result = rewriteSettingsForVaultRename(original, "Media/Old", "Media/New");
  assert.equal(result.changed, false);
  assert.deepEqual(result.settings, original);
});

void test("vault path rewriter handles exact paths and descendants only", () => {
  const original = normalizeSettings({});
  const { rewritePath } = rewriteSettingsForVaultRename(original, "Media/Old", "Media/New");

  assert.equal(rewritePath("Media/Old"), "Media/New");
  assert.equal(rewritePath("Media/Old/Sub/file.webp"), "Media/New/Sub/file.webp");
  assert.equal(rewritePath("Media/Older/file.webp"), "Media/Older/file.webp");
  assert.equal(rewritePath("Other/Media/Old/file.webp"), "Other/Media/Old/file.webp");
});

void test("vault rename does not mutate the input settings object", () => {
  const original = normalizeSettings({ wallpaperPath: "Media/Old/default.webp" });
  const before = structuredClone(original);

  rewriteSettingsForVaultRename(original, "Media/Old", "Media/New");
  assert.deepEqual(original, before);
});
