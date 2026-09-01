import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};
const verifier = fs.readFileSync("verify-build.mjs", "utf8");
const esbuild = fs.readFileSync("esbuild.config.mjs", "utf8");

void test("npm check runs the production bundle verifier", () => {
  assert.match(packageJson.scripts?.check || "", /node verify-build\.mjs/);
});

void test("production bundle verifier rejects sourcemaps and oversized output", () => {
  assert.match(verifier, /sourceMappingURL/);
  assert.match(verifier, /BUNDLE_BUDGET/);
  assert.match(verifier, /STYLES_BUDGET/);
  assert.match(verifier, /isDesktopOnly !== true/);
});

void test("production esbuild explicitly disables sourcemaps", () => {
  assert.match(esbuild, /sourcemap: production \? false : "inline"/);
});
