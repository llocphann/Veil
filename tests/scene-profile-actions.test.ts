import assert from "node:assert/strict";
import test from "node:test";
import { duplicateSceneProfile } from "../src/scene-profile-actions";
import { normalizeSettings } from "../src/settings";

void test("duplicating a scene copies its complete appearance with a fresh id", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/default.webp",
    profiles: [{
      id: "focus",
      name: "Focus",
      wallpaperPath: "Media/Focus/focus.webp",
      wallpaperPoolEnabled: true,
      wallpaperPoolIncludeSubfolders: true,
      displayMode: "contain",
      wallpaperPositionX: 24,
      wallpaperPositionY: 71,
      wallpaperZoom: 142,
      transitionDuration: 620,
      opacity: 48,
      paneOpacity: 39,
      paneContentOpacity: 91,
      vignetteMode: "circle",
      vignetteIntensity: 42,
      vignetteRadius: 63,
      blurEnabled: true,
      blurIntensity: 13,
      dimEnabled: true,
      dimIntensity: 26,
      colorOverlayEnabled: true,
      colorOverlayColor: "#123456",
      colorOverlayOpacity: 31,
      colorOverlayBlendMode: "soft-light",
      effectPreset: "retro",
      effectIntensity: 37,
      pauseWhenHidden: false,
      respectReducedMotion: false,
    }],
  });
  const source = settings.profiles[0];
  assert.ok(source);

  const duplicate = duplicateSceneProfile(settings.profiles, source, settings);

  assert.notEqual(duplicate.id, source.id);
  assert.equal(duplicate.name, "Focus copy");
  const { id: _sourceId, name: _sourceName, ...sourceAppearance } = source;
  const { id: _duplicateId, name: _duplicateName, ...duplicateAppearance } = duplicate;
  assert.deepEqual(duplicateAppearance, sourceAppearance);
  assert.equal(source.name, "Focus");
});

void test("duplicate scene names keep the copy suffix within the name limit", () => {
  const settings = normalizeSettings({
    profiles: [{
      id: "long",
      name: "x".repeat(80),
    }],
  });
  const source = settings.profiles[0];
  assert.ok(source);
  const duplicate = duplicateSceneProfile(settings.profiles, source, settings);
  assert.equal(duplicate.name.length, 80);
  assert.equal(duplicate.name.endsWith(" copy"), true);
  assert.notEqual(duplicate.name, source.name);
});
