import assert from "node:assert/strict";
import test from "node:test";
import { resolveWallpaper } from "../src/profile-resolver";
import { normalizeSettings } from "../src/settings";
import type { NoteContext } from "../src/context-rules";

const context: NoteContext = {
  path: "Projects/Alpha.md",
  name: "Alpha.md",
  basename: "Alpha",
  tags: ["#focus"],
  properties: { veil: "focus" },
};

void test("profile-backed rules switch the complete appearance", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/default.webp",
    opacity: 15,
    profiles: [{
      id: "focus",
      name: "Focus",
      wallpaperPath: "Media/focus.webp",
      opacity: 62,
      paneOpacity: 45,
      blurEnabled: true,
      blurIntensity: 12,
      effectPreset: "retro",
      effectIntensity: 24,
      pauseWhenHidden: false,
    }],
    wallpaperRules: [{
      id: "focus-route",
      enabled: true,
      matchType: "tag",
      matchValue: "focus",
      profileId: "focus",
      wallpaperPath: "Media/legacy.webp",
    }],
  });

  const resolved = resolveWallpaper(settings, context);
  assert.equal(resolved.profile?.name, "Focus");
  assert.equal(resolved.path, "Media/focus.webp");
  assert.equal(resolved.appearance.opacity, 62);
  assert.equal(resolved.appearance.paneOpacity, 45);
  assert.equal(resolved.appearance.blurEnabled, true);
  assert.equal(resolved.appearance.blurIntensity, 12);
  assert.equal(resolved.appearance.effectPreset, "retro");
  assert.equal(resolved.appearance.pauseWhenHidden, false);
});

void test("legacy inline rules replace media while preserving global appearance", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/default.webp",
    opacity: 37,
    dimEnabled: true,
    dimIntensity: 22,
    wallpaperRules: [{
      id: "project",
      enabled: true,
      matchType: "folder",
      matchValue: "Projects",
      wallpaperPath: "Media/project.webp",
    }],
  });

  const resolved = resolveWallpaper(settings, context);
  assert.equal(resolved.profile, null);
  assert.equal(resolved.path, "Media/project.webp");
  assert.equal(resolved.appearance.opacity, 37);
  assert.equal(resolved.appearance.dimEnabled, true);
  assert.equal(resolved.appearance.dimIntensity, 22);
});

void test("unmatched contexts use the global default appearance", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/default.webp",
    paneOpacity: 58,
  });
  const otherContext: NoteContext = {
    path: "Journal/Today.md",
    name: "Today.md",
    basename: "Today",
    tags: [],
    properties: {},
  };

  const resolved = resolveWallpaper(settings, otherContext);
  assert.equal(resolved.rule, null);
  assert.equal(resolved.profile, null);
  assert.equal(resolved.path, "Media/default.webp");
  assert.equal(resolved.appearance.paneOpacity, 58);
});
