import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseSource = fs.readFileSync(
  new URL("../src/settings-tab-base.ts", import.meta.url),
  "utf8",
);
const sceneSource = fs.readFileSync(
  new URL("../src/settings-scene-definitions.ts", import.meta.url),
  "utf8",
);
const appearanceSource = fs.readFileSync(
  new URL("../src/settings-appearance-definitions.ts", import.meta.url),
  "utf8",
);

void test("settings base delegates appearance and video definition ownership", () => {
  assert.match(baseSource, /createSceneDefinitions\(/);
  assert.match(baseSource, /createEffectsDefinitions\(/);
  assert.match(baseSource, /createVideoDefinitions\(\)/);
  assert.doesNotMatch(baseSource, /createSceneAppearanceDefinitions\(/);
  assert.doesNotMatch(baseSource, /Scene-specific edge shading strength/);
  assert.doesNotMatch(baseSource, /Performance guide/);
  assert.doesNotMatch(baseSource, /Video compatibility/);
});

void test("scene definitions compose appearance controls through the appearance module", () => {
  assert.match(sceneSource, /createSceneAppearanceDefinitions\(/);
});

void test("appearance definition module owns scene, effect, and video controls", () => {
  assert.match(appearanceSource, /export function createSceneAppearanceDefinitions/);
  assert.match(appearanceSource, /Scene-specific edge shading strength/);
  assert.match(appearanceSource, /export function createEffectsDefinitions/);
  assert.match(appearanceSource, /Performance guide/);
  assert.match(appearanceSource, /export function createVideoDefinitions/);
  assert.match(appearanceSource, /Video compatibility/);
});
