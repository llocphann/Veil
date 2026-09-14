import assert from "node:assert/strict";
import test from "node:test";
import {
  migratePersistedVeilData,
  persistedVeilDataSnapshot,
  VEIL_PERSISTED_DATA_SCHEMA_KEY,
  VEIL_PERSISTED_DATA_SCHEMA_VERSION,
} from "../src/persisted-data-schema";
import { DEFAULT_SETTINGS } from "../src/settings";

void test("unversioned 1.x data migrates deterministically from v0 to v1", () => {
  const legacy = {
    ...DEFAULT_SETTINGS,
    wallpaperPath: "Wallpapers/a.webp",
    wallpaperLibrary: {
      favorites: ["Wallpapers/a.webp"],
      recent: ["Wallpapers/b.webp"],
    },
  };

  const first = migratePersistedVeilData(legacy);
  const second = migratePersistedVeilData(legacy);

  assert.equal(first.sourceVersion, 0);
  assert.equal(first.targetVersion, VEIL_PERSISTED_DATA_SCHEMA_VERSION);
  assert.equal(first.migrated, true);
  assert.deepEqual(first, second);
  assert.equal(
    first.data[VEIL_PERSISTED_DATA_SCHEMA_KEY],
    VEIL_PERSISTED_DATA_SCHEMA_VERSION,
  );
  assert.equal(first.data.wallpaperPath, legacy.wallpaperPath);
  assert.deepEqual(first.data.wallpaperLibrary, legacy.wallpaperLibrary);
});

void test("current persisted data is idempotent", () => {
  const current = {
    [VEIL_PERSISTED_DATA_SCHEMA_KEY]: VEIL_PERSISTED_DATA_SCHEMA_VERSION,
    wallpaperPath: "Wallpapers/current.webp",
  };
  const migrated = migratePersistedVeilData(current);

  assert.equal(migrated.sourceVersion, VEIL_PERSISTED_DATA_SCHEMA_VERSION);
  assert.equal(migrated.targetVersion, VEIL_PERSISTED_DATA_SCHEMA_VERSION);
  assert.equal(migrated.migrated, false);
  assert.deepEqual(migrated.data, current);
  assert.notEqual(migrated.data, current);
});

void test("future persisted schemas are rejected instead of silently downgraded", () => {
  assert.throws(
    () => migratePersistedVeilData({
      [VEIL_PERSISTED_DATA_SCHEMA_KEY]: VEIL_PERSISTED_DATA_SCHEMA_VERSION + 1,
    }),
    /newer than this plugin supports/,
  );
});

void test("malformed persisted schema markers are rejected", () => {
  assert.throws(
    () => migratePersistedVeilData({ [VEIL_PERSISTED_DATA_SCHEMA_KEY]: "1" }),
    /Invalid Veil persisted data schema/,
  );
  assert.throws(
    () => migratePersistedVeilData({ [VEIL_PERSISTED_DATA_SCHEMA_KEY]: -1 }),
    /Invalid Veil persisted data schema/,
  );
});

void test("persisted snapshots always write the current schema and clone library lists", () => {
  const library = {
    favorites: ["Wallpapers/favorite.webp"],
    recent: ["Wallpapers/recent.webp"],
  };
  const snapshot = persistedVeilDataSnapshot(DEFAULT_SETTINGS, library);

  assert.equal(
    snapshot[VEIL_PERSISTED_DATA_SCHEMA_KEY],
    VEIL_PERSISTED_DATA_SCHEMA_VERSION,
  );
  assert.deepEqual(snapshot.wallpaperLibrary, library);
  assert.notEqual(
    (snapshot.wallpaperLibrary as typeof library).favorites,
    library.favorites,
  );
  assert.notEqual(
    (snapshot.wallpaperLibrary as typeof library).recent,
    library.recent,
  );
});
