import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const persistenceSource = readFileSync(
  new URL("../src/settings-persistence.ts", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(new URL("../src/settings.ts", import.meta.url), "utf8");

void test("startup migrates persisted data before settings and library normalization", () => {
  const onload = mainSource.match(
    /async onload\(\): Promise<void> \{([\s\S]*?)\n {2}onunload\(\): void/,
  )?.[1] || "";

  const migrateIndex = onload.indexOf("migratePersistedVeilData(await this.loadData())");
  const normalizeIndex = onload.indexOf("normalizeSettings(storedData, normalizePath)");
  const libraryIndex = onload.indexOf("wallpaperLibrary.load(storedData.wallpaperLibrary)");
  assert.ok(migrateIndex >= 0);
  assert.ok(normalizeIndex > migrateIndex);
  assert.ok(libraryIndex > migrateIndex);
});

void test("settings persistence writes through the versioned data snapshot", () => {
  assert.match(persistenceSource, /persistedVeilDataSnapshot\(settings, this\.getLibrary\(\)\)/);
  assert.match(persistenceSource, /this\.saveData\(snapshot\)/);
});

void test("persistence schema metadata does not leak into runtime settings", () => {
  const settingsInterface = settingsSource.match(
    /export interface VeilSettings \{([\s\S]*?)\n\}/,
  )?.[1] || "";
  assert.doesNotMatch(settingsInterface, /dataSchemaVersion/);
});
