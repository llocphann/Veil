import type { VeilSettings } from "./settings";
import type { WallpaperLibraryState } from "./wallpaper-library-state";

export const VEIL_PERSISTED_DATA_SCHEMA_VERSION = 1;
export const VEIL_PERSISTED_DATA_SCHEMA_KEY = "dataSchemaVersion" as const;

export interface PersistedDataMigrationResult {
  data: Record<string, unknown>;
  sourceVersion: number;
  targetVersion: number;
  migrated: boolean;
}

type PersistedMigration = (data: Record<string, unknown>) => Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function storedSchemaVersion(data: Record<string, unknown>): number {
  const value = data[VEIL_PERSISTED_DATA_SCHEMA_KEY];
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid Veil persisted data schema: ${String(value)}.`);
  }
  if (value > VEIL_PERSISTED_DATA_SCHEMA_VERSION) {
    throw new Error(
      `Veil data schema ${value} is newer than this plugin supports (${VEIL_PERSISTED_DATA_SCHEMA_VERSION}).`,
    );
  }
  return value;
}

const MIGRATIONS: Readonly<Record<number, PersistedMigration>> = {
  0: (data) => ({
    ...data,
    [VEIL_PERSISTED_DATA_SCHEMA_KEY]: 1,
  }),
};

export function migratePersistedVeilData(value: unknown): PersistedDataMigrationResult {
  let data: Record<string, unknown> = isRecord(value) ? { ...value } : {};
  const sourceVersion = storedSchemaVersion(data);
  let version = sourceVersion;

  while (version < VEIL_PERSISTED_DATA_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new Error(`No Veil persisted data migration exists for schema ${version}.`);
    }
    data = migrate(data);
    version += 1;
    const migratedVersion = storedSchemaVersion(data);
    if (migratedVersion !== version) {
      throw new Error(
        `Veil persisted data migration ${version - 1} did not produce schema ${version}.`,
      );
    }
  }

  return {
    data,
    sourceVersion,
    targetVersion: version,
    migrated: sourceVersion !== version,
  };
}

export function persistedVeilDataSnapshot(
  settings: VeilSettings,
  library: WallpaperLibraryState,
): Record<string, unknown> {
  return {
    [VEIL_PERSISTED_DATA_SCHEMA_KEY]: VEIL_PERSISTED_DATA_SCHEMA_VERSION,
    ...settings,
    wallpaperLibrary: {
      favorites: [...library.favorites],
      recent: [...library.recent],
    },
  };
}
