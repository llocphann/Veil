import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

void test("css changes re-resolve only when routing depends on theme", () => {
  const handler = source.match(
    /this\.registerEvent\(this\.app\.workspace\.on\("css-change", \(\) => \{([\s\S]*?)\n {4}\}\)\);/,
  )?.[1] || "";

  assert.match(handler, /if \(!this\.layoutReady \|\| !this\.settings\.enabled\) return/);
  assert.match(handler, /contextRulesDependOnTheme\(\[/);
  assert.match(handler, /\.\.\.this\.settings\.wallpaperRules/);
  assert.match(handler, /\.\.\.this\.settings\.opacityExclusions/);
  assert.match(handler, /this\.scheduleApplyToWorkspace\(\)/);
  assert.doesNotMatch(handler, /this\.refreshWallpaper\(\)/);
});
