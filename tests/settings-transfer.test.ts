import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVeilSettingsImport,
  serializeVeilSettings,
} from "../src/settings-transfer";
import { normalizeSettings } from "../src/settings";

void test("Veil settings export and import round-trip through schema 2", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/wallpaper.webp",
    wallpaperPositionX: 31,
    wallpaperPositionY: 68,
    wallpaperZoom: 128,
    transitionDuration: 460,
    colorOverlayEnabled: true,
    colorOverlayColor: "#123456",
    colorOverlayOpacity: 42,
    profiles: [{
      id: "cinema",
      name: "Cinema",
      wallpaperPath: "Media/cinema.webp",
      wallpaperPositionX: 72,
      wallpaperPositionY: 42,
      wallpaperZoom: 145,
      transitionDuration: 620,
      effectPreset: "tv-noise",
      effectIntensity: 21,
      paneOpacity: 44,
    }],
    wallpaperRules: [{
      id: "route",
      enabled: true,
      matchType: "tag",
      matchValue: "#media",
      profileId: "cinema",
      wallpaperPath: "Media/legacy.gif",
    }],
  });
  const exported = serializeVeilSettings(settings, "9.9.9", new Date("2026-08-31T00:00:00Z"));
  const envelope = JSON.parse(exported) as Record<string, unknown>;

  assert.equal(envelope.format, "veil-settings");
  assert.equal(envelope.schemaVersion, 2);
  assert.equal(envelope.pluginVersion, "9.9.9");
  assert.deepEqual(parseVeilSettingsImport(exported), settings);
});

void test("schema 1 exports migrate without changing inline wallpaper behavior", () => {
  const imported = parseVeilSettingsImport(JSON.stringify({
    format: "veil-settings",
    schemaVersion: 1,
    pluginVersion: "1.3.0",
    exportedAt: "2026-08-31T00:00:00.000Z",
    settings: {
      wallpaperPath: "Media/default.webp",
      opacity: 63,
      wallpaperRules: [{
        id: "legacy",
        enabled: true,
        matchType: "folder",
        matchValue: "Projects",
        wallpaperPath: "Media/project.webp",
      }],
    },
  }));

  assert.equal(imported.opacity, 63);
  assert.equal(imported.wallpaperPositionX, 50);
  assert.equal(imported.wallpaperPositionY, 50);
  assert.equal(imported.wallpaperZoom, 100);
  assert.equal(imported.transitionDuration, 320);
  assert.deepEqual(imported.profiles, []);
  assert.equal(imported.wallpaperRules[0]?.profileId, "");
  assert.equal(imported.wallpaperRules[0]?.wallpaperPath, "Media/project.webp");
});

void test("Veil import accepts raw settings but rejects foreign or future envelopes", () => {
  assert.equal(parseVeilSettingsImport('{"opacity":999}').opacity, 100);
  assert.throws(() => parseVeilSettingsImport("not json"), /valid JSON/);
  assert.throws(() => parseVeilSettingsImport("{}"), /does not contain Veil settings/);
  assert.throws(
    () => parseVeilSettingsImport('{"format":"ledge-settings","schemaVersion":1,"settings":{}}'),
    /not exported by Veil/,
  );
  assert.throws(
    () => parseVeilSettingsImport('{"format":"veil-settings","schemaVersion":3,"settings":{}}'),
    /Unsupported Veil settings schema/,
  );
});
