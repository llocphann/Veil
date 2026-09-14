import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../release-version.mjs", import.meta.url));

function releaseVersion(...args: string[]): string {
  return execFileSync(process.execPath, [script, ...args], { encoding: "utf8" }).trim();
}

void test("latest published version uses semantic order rather than list order", () => {
  assert.equal(
    releaseVersion("--latest", "1.5.3", "2.0.0", "1.9.9", "10.0.0", "2.10.4"),
    "10.0.0",
  );
});

void test("latest published version ignores non-release tags", () => {
  assert.equal(
    releaseVersion("--latest", "v2.0.0", "2.0.0-beta.1", "notes", "1.5.3"),
    "1.5.3",
  );
  assert.equal(releaseVersion("--latest"), "");
});

void test("candidate versions ahead of stable remain unchanged", () => {
  assert.equal(releaseVersion("2.0.0", "1.5.3"), "2.0.0");
  assert.equal(releaseVersion("3.0.0", "2.9.9"), "3.0.0");
});

void test("stale or already-published candidates advance from stable latest", () => {
  assert.equal(releaseVersion("1.5.2", "1.5.3"), "1.5.4");
  assert.equal(releaseVersion("1.5.3", "1.5.3"), "1.5.4");
  assert.equal(releaseVersion("1.9.0", "2.0.0"), "2.0.1");
});

void test("candidate version is used when no stable release exists", () => {
  assert.equal(releaseVersion("2.0.0", ""), "2.0.0");
});

void test("invalid direct version inputs fail closed", () => {
  assert.throws(() => releaseVersion("v2.0.0", "1.5.3"));
  assert.throws(() => releaseVersion("2.0", "1.5.3"));
  assert.throws(() => releaseVersion("2.0.0", "latest"));
});
