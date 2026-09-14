import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts?: Record<string, string> };
const runner = readFileSync(new URL("../perf-check.mjs", import.meta.url), "utf8");

void test("npm run perf is the single entry point", () => {
  assert.equal(packageJson.scripts?.perf, "node perf-check.mjs");
  assert.match(packageJson.scripts?.["test:perf"] || "", /stability-contract\.test\.ts/);
  assert.match(packageJson.scripts?.["bench:settings"] || "", /settings-change\.bench\.ts/);
});

void test("performance runner compares against the 1.5.3 stable baseline without mutating it", () => {
  assert.match(runner, /BASELINE_VERSION = "1\.5\.3"/);
  assert.match(runner, /origin\/stable/);
  assert.match(runner, /git", \["show"/);
  assert.match(runner, /git", \["worktree", "add", "--detach"/);
  assert.doesNotMatch(runner, /git", \["push"/);
  assert.doesNotMatch(runner, /git", \["reset", "--hard"/);
});

void test("performance runner is self-contained and enforces optimization contracts", () => {
  assert.match(runner, /Dependencies are missing; running npm ci first/);
  assert.match(runner, /npmCommand, \["run", "test:perf"\]/);
  assert.match(runner, /npmCommand, \["run", "build"\]/);
  assert.match(runner, /verify-build\.mjs/);
  assert.match(runner, /Optimization work-contract comparison/);
  assert.match(runner, /VEIL_PERF_MAX_BUNDLE_GROWTH_PCT/);
  assert.match(runner, /PERF GATE: PASS/);
  assert.match(runner, /PERF GATE: FAIL/);
});
