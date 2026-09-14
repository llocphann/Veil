import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVeilSettingsImport,
  serializeVeilSettings,
} from "../src/settings-transfer";
import { normalizeSettings } from "../src/settings";

void test("Veil settings export and import round-trip through a versioned envelope", () => {
  const settings = normalizeSettings({
    wallpaperPath: "Media/wallpaper.webp",
    colorOverlayEnabled: true,
    colorOverlayColor: "#123456",
    colorOverlayOpacity: 42,
    effectPreset: "tv-noise",
    effectIntensity: 21,
    wallpaperRules: [{
      id: "route",
      enabled: true,
      matchType: "tag",
      matchValue: "#media",
      wallpaperPath: "Media/alternate.gif",
    }],
  });
  const exported = serializeVeilSettings(settings, "9.9.9", new Date("2026-08-31T00:00:00Z"));
  const envelope = JSON.parse(exported) as Record<string, unknown>;

  assert.equal(envelope.format, "veil-settings");
  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.pluginVersion, "9.9.9");
  assert.deepEqual(parseVeilSettingsImport(exported), settings);
});

void test("Veil import accepts legacy raw settings but rejects foreign or future envelopes", () => {
  assert.equal(parseVeilSettingsImport('{"opacity":999}').opacity, 100);
  assert.throws(() => parseVeilSettingsImport("not json"), /valid JSON/);
  assert.throws(() => parseVeilSettingsImport("{}"), /does not contain Veil settings/);
  assert.throws(
    () => parseVeilSettingsImport('{"format":"ledge-settings","schemaVersion":1,"settings":{}}'),
    /not exported by Veil/,
  );
  assert.throws(
    () => parseVeilSettingsImport('{"format":"veil-settings","schemaVersion":2,"settings":{}}'),
    /Unsupported Veil settings schema/,
  );
});
