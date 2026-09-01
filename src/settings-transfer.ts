import { DEFAULT_SETTINGS, normalizeSettings, type VeilSettings } from "./settings";

export const VEIL_SETTINGS_FORMAT = "veil-settings";
export const VEIL_SETTINGS_SCHEMA_VERSION = 2;
const OLDEST_SUPPORTED_SCHEMA_VERSION = 1;

interface VeilSettingsEnvelope {
  format: typeof VEIL_SETTINGS_FORMAT;
  schemaVersion: typeof VEIL_SETTINGS_SCHEMA_VERSION;
  pluginVersion: string;
  exportedAt: string;
  settings: VeilSettings;
}

type PathNormalizer = (path: string) => string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrateSettingsEnvelope(schemaVersion: number, settings: unknown): unknown {
  if (schemaVersion === 1) {
    // Schema 1 predates reusable scenes. normalizeSettings supplies profiles=[]
    // and profileId="" so every 1.3 wallpaper rule keeps its inline behavior.
    return settings;
  }
  if (schemaVersion === VEIL_SETTINGS_SCHEMA_VERSION) return settings;
  throw new Error(`Unsupported Veil settings schema: ${String(schemaVersion)}.`);
}

export function serializeVeilSettings(
  settings: VeilSettings,
  pluginVersion: string,
  exportedAt = new Date(),
): string {
  const envelope: VeilSettingsEnvelope = {
    format: VEIL_SETTINGS_FORMAT,
    schemaVersion: VEIL_SETTINGS_SCHEMA_VERSION,
    pluginVersion,
    exportedAt: exportedAt.toISOString(),
    settings: normalizeSettings(settings),
  };
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

export function parseVeilSettingsImport(
  text: string,
  normalizePath?: PathNormalizer,
): VeilSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isRecord(parsed)) throw new Error("The imported file must contain a JSON object.");

  let settings: unknown = parsed;
  if ("format" in parsed || "schemaVersion" in parsed || "settings" in parsed) {
    if (parsed.format !== VEIL_SETTINGS_FORMAT) {
      throw new Error("This settings file was not exported by Veil.");
    }
    if (
      typeof parsed.schemaVersion !== "number" ||
      !Number.isInteger(parsed.schemaVersion) ||
      parsed.schemaVersion < OLDEST_SUPPORTED_SCHEMA_VERSION ||
      parsed.schemaVersion > VEIL_SETTINGS_SCHEMA_VERSION
    ) {
      throw new Error(`Unsupported Veil settings schema: ${String(parsed.schemaVersion)}.`);
    }
    settings = migrateSettingsEnvelope(parsed.schemaVersion, parsed.settings);
  } else if (!Object.keys(DEFAULT_SETTINGS).some((key) => key in parsed)) {
    throw new Error("This JSON object does not contain Veil settings.");
  }
  if (!isRecord(settings)) throw new Error("The imported Veil settings are missing.");
  return normalizeSettings(settings, normalizePath);
}
