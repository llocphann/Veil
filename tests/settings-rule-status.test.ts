import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/settings-routing-definitions.ts", "utf8");

void test("wallpaper rule readiness uses shared context syntax validation", () => {
  assert.match(source, /import \{ contextRuleSyntaxValid \} from "\.\/context-rules"/);
  assert.match(
    source,
    /function wallpaperRuleReady\([\s\S]*?\): boolean \{\s*if \(!contextRuleSyntaxValid\(rule\)\) return false;/,
  );
});

void test("opacity exclusion warnings use shared context syntax validation", () => {
  assert.match(
    source,
    /contextRuleSyntaxValid\(rule\)[\s\S]*?rule\.excludePaneSurface \|\| rule\.excludePaneContent/,
  );
});
