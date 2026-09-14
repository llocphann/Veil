import assert from "node:assert/strict";
import test from "node:test";
import {
  latestPublishedVersion,
  nextReleaseVersion,
} from "../release-version.mjs";

void test("latest published version uses semantic order rather than list order", () => {
  assert.equal(
    latestPublishedVersion(["1.5.3", "2.0.0", "1.9.9", "10.0.0", "2.10.4"]),
    "10.0.0",
  );
});

void test("latest published version ignores non-release tags", () => {
  assert.equal(
    latestPublishedVersion(["v2.0.0", "2.0.0-beta.1", "notes", "1.5.3"]),
    "1.5.3",
  );
  assert.equal(latestPublishedVersion([]), "");
});

void test("candidate versions ahead of stable remain unchanged", () => {
  assert.equal(nextReleaseVersion("2.0.0", "1.5.3"), "2.0.0");
  assert.equal(nextReleaseVersion("3.0.0", "2.9.9"), "3.0.0");
});

void test("stale or already-published candidates advance from stable latest", () => {
  assert.equal(nextReleaseVersion("1.5.2", "1.5.3"), "1.5.4");
  assert.equal(nextReleaseVersion("1.5.3", "1.5.3"), "1.5.4");
  assert.equal(nextReleaseVersion("1.9.0", "2.0.0"), "2.0.1");
});

void test("candidate version is used when no stable release exists", () => {
  assert.equal(nextReleaseVersion("2.0.0", ""), "2.0.0");
});

void test("invalid direct version inputs fail closed", () => {
  assert.throws(() => nextReleaseVersion("v2.0.0", "1.5.3"));
  assert.throws(() => nextReleaseVersion("2.0", "1.5.3"));
  assert.throws(() => nextReleaseVersion("2.0.0", "latest"));
});
