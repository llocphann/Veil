import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseSource = fs.readFileSync("src/settings-tab-base.ts", "utf8");
const transferIoSource = fs.readFileSync("src/settings-transfer-io.ts", "utf8");

void test("settings base delegates transfer io ownership", () => {
  assert.match(baseSource, /exportVeilSettingsFile\(/);
  assert.match(baseSource, /chooseVeilSettingsImportFile\(/);
  assert.doesNotMatch(baseSource, /serializeVeilSettings\(/);
  assert.doesNotMatch(baseSource, /parseVeilSettingsImport\(/);
  assert.doesNotMatch(baseSource, /new Blob\(/);
  assert.doesNotMatch(baseSource, /createObjectURL\(/);
  assert.doesNotMatch(baseSource, /accept = "\.json,application\/json"/);
});

void test("transfer io module owns export, import, and size guard", () => {
  assert.match(transferIoSource, /MAX_SETTINGS_IMPORT_BYTES = 1024 \* 1024/);
  assert.match(transferIoSource, /serializeVeilSettings\(/);
  assert.match(transferIoSource, /parseVeilSettingsImport\(/);
  assert.match(transferIoSource, /new Blob\(/);
  assert.match(transferIoSource, /URL\.createObjectURL\(/);
  assert.match(transferIoSource, /containerEl\.createEl\("input"\)/);
  assert.match(transferIoSource, /Veil settings import is limited to one megabyte\./);
});
