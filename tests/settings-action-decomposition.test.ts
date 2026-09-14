import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseSource = fs.readFileSync(
  new URL("../src/settings-tab-base.ts", import.meta.url),
  "utf8",
);
const actionSource = fs.readFileSync(
  new URL("../src/settings-action-definitions.ts", import.meta.url),
  "utf8",
);

void test("settings base delegates action and support definition ownership", () => {
  assert.match(baseSource, /createActionsDefinitions\(/);
  assert.match(baseSource, /createSupportDefinitions\(\)/);
  assert.doesNotMatch(baseSource, /name: "Export settings"/);
  assert.doesNotMatch(baseSource, /name: "Buy me a coffee"/);
});

void test("action definition module owns quick actions, transfer actions, and support markup", () => {
  assert.match(actionSource, /export function createActionsDefinitions/);
  assert.match(actionSource, /name: "Reload wallpaper"/);
  assert.match(actionSource, /name: "Export settings"/);
  assert.match(actionSource, /export function createSupportDefinitions/);
  assert.match(actionSource, /cls: "veil-support-link"/);
});
