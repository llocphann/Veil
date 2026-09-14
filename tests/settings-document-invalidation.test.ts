import assert from "node:assert/strict";
import test from "node:test";
import { resolveWallpaper } from "../src/profile-resolver";
import { SceneRuntime } from "../src/scene-runtime";
import {
  resolvedDocumentSettingsChanged,
} from "../src/settings-document-invalidation";
import {
  appearanceFromSettings,
  DEFAULT_SETTINGS,
  type VeilProfile,
  type VeilSettings,
} from "../src/settings";

function settings(): VeilSettings {
  return {
    ...DEFAULT_SETTINGS,
    profiles: [],
    wallpaperRules: [],
    opacityExclusions: [],
  };
}

function scene(source: VeilSettings, id = "scene-a", name = "Scene A"): VeilProfile {
  return {
    id,
    name,
    ...appearanceFromSettings(source),
    wallpaperPath: "Wallpapers/scene.webp",
  };
}

const context = {
  path: "Notes/A.md",
  name: "A.md",
  basename: "A",
  tags: [],
  properties: {},
};

void test("global appearance changes do not invalidate a profile-backed document", () => {
  const previous = settings();
  const profile = scene(previous);
  previous.profiles = [profile];
  previous.wallpaperRules = [{
    id: "rule-a",
    enabled: true,
    matchType: "path",
    matchValue: context.path,
    profileId: profile.id,
    wallpaperPath: "",
  }];
  const next = { ...previous, opacity: previous.opacity + 10 };

  assert.equal(
    resolvedDocumentSettingsChanged(
      previous,
      next,
      context,
      resolveWallpaper(previous, context),
      resolveWallpaper(next, context),
    ),
    false,
  );
});

void test("global appearance changes invalidate a default document", () => {
  const previous = settings();
  const next = { ...previous, opacity: previous.opacity + 10 };

  assert.equal(
    resolvedDocumentSettingsChanged(
      previous,
      next,
      context,
      resolveWallpaper(previous, context),
      resolveWallpaper(next, context),
    ),
    true,
  );
});

void test("inline rules ignore global source and pool settings", () => {
  const previous = settings();
  previous.wallpaperRules = [{
    id: "rule-a",
    enabled: true,
    matchType: "path",
    matchValue: context.path,
    profileId: "",
    wallpaperPath: "Wallpapers/inline.webp",
  }];
  const next = {
    ...previous,
    wallpaperPath: "Wallpapers/default-changed.webp",
    wallpaperPoolEnabled: true,
    wallpaperPoolIncludeSubfolders: true,
  };

  assert.equal(
    resolvedDocumentSettingsChanged(
      previous,
      next,
      context,
      resolveWallpaper(previous, context),
      resolveWallpaper(next, context),
    ),
    false,
  );
});

void test("profile-backed rules ignore legacy fallback wallpaper changes", () => {
  const previous = settings();
  const profile = scene(previous);
  previous.profiles = [profile];
  previous.wallpaperRules = [{
    id: "rule-a",
    enabled: true,
    matchType: "path",
    matchValue: context.path,
    profileId: profile.id,
    wallpaperPath: "Wallpapers/legacy-a.webp",
  }];
  const next: VeilSettings = {
    ...previous,
    wallpaperRules: [{
      ...previous.wallpaperRules[0]!,
      wallpaperPath: "Wallpapers/legacy-b.webp",
    }],
  };

  assert.equal(
    resolvedDocumentSettingsChanged(
      previous,
      next,
      context,
      resolveWallpaper(previous, context),
      resolveWallpaper(next, context),
    ),
    false,
  );
});

void test("unmatched opacity rule changes do not invalidate the document", () => {
  const previous = settings();
  const next: VeilSettings = {
    ...previous,
    opacityExclusions: [{
      id: "opacity-b",
      enabled: true,
      matchType: "path",
      matchValue: "Notes/B.md",
      excludePaneSurface: true,
      excludePaneContent: true,
    }],
  };

  assert.equal(
    resolvedDocumentSettingsChanged(
      previous,
      next,
      context,
      resolveWallpaper(previous, context),
      resolveWallpaper(next, context),
    ),
    false,
  );
});

void test("profile label changes invalidate documents using that profile", () => {
  const previous = settings();
  const profile = scene(previous);
  previous.profiles = [profile];
  previous.wallpaperRules = [{
    id: "rule-a",
    enabled: true,
    matchType: "path",
    matchValue: context.path,
    profileId: profile.id,
    wallpaperPath: "",
  }];
  const next = {
    ...previous,
    profiles: [{ ...profile, name: "Renamed scene" }],
  };

  assert.equal(
    resolvedDocumentSettingsChanged(
      previous,
      next,
      context,
      resolveWallpaper(previous, context),
      resolveWallpaper(next, context),
    ),
    true,
  );
});

void test("scene snapshots compare deleted manual overrides without mutating runtime state", () => {
  const previous = settings();
  const profile = scene(previous);
  previous.profiles = [profile];
  const runtime = new SceneRuntime();
  assert.equal(runtime.setManualProfile(profile.id, previous).kind, "selected");

  const next = settings();
  const before = runtime.resolveSnapshot(previous, context);
  const after = runtime.resolveSnapshot(next, context);

  assert.equal(before.profile?.id, profile.id);
  assert.equal(after.profile, null);
  assert.equal(runtime.getManualProfileId(), profile.id);
  runtime.reconcileSettings(next);
  assert.equal(runtime.getManualProfileId(), "");
});
