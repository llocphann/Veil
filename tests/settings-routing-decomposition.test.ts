import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const baseSource = fs.readFileSync(
  new URL("../src/settings-tab-base.ts", import.meta.url),
  "utf8",
);
const routingSource = fs.readFileSync(
  new URL("../src/settings-routing-definitions.ts", import.meta.url),
  "utf8",
);

void test("settings base delegates routing definition ownership", () => {
  assert.match(baseSource, /createWallpaperRuleDefinitions\(/);
  assert.match(baseSource, /createOpacityExclusionDefinitions\(/);
  assert.doesNotMatch(baseSource, /private wallpaperRulePage/);
  assert.doesNotMatch(baseSource, /private opacityExclusionPage/);
  assert.doesNotMatch(baseSource, /private matchRuleSettings/);
  assert.doesNotMatch(baseSource, /private wallpaperRuleReady/);
});

void test("routing definition module owns rule pages and readiness", () => {
  assert.match(routingSource, /function wallpaperRulePage\(/);
  assert.match(routingSource, /function opacityExclusionPage\(/);
  assert.match(routingSource, /function matchRuleSettings\(/);
  assert.match(routingSource, /function wallpaperRuleReady\(/);
  assert.match(routingSource, /contextRuleSyntaxValid\(rule\)/);
});
