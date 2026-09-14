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

void test("settings base delegates scene definition ownership", () => {
  assert.match(baseSource, /createSceneDefinitions\(/);
  assert.doesNotMatch(baseSource, /private scenePage/);
  assert.doesNotMatch(baseSource, /private sceneAppearanceDefinitions/);
  assert.doesNotMatch(baseSource, /name: "Duplicate scene"/);
  assert.doesNotMatch(baseSource, /name: "Delete scene"/);
});

void test("scene definition module owns scene pages and appearance composition", () => {
  assert.match(sceneSource, /export function createSceneDefinitions/);
  assert.match(sceneSource, /function scenePage\(/);
  assert.match(sceneSource, /createSceneAppearanceDefinitions\(/);
  assert.match(sceneSource, /name: "Duplicate scene"/);
  assert.match(sceneSource, /name: "Delete scene"/);
});
