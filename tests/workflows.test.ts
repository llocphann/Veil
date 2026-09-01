import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseDocument } from "yaml";

const WORKFLOWS = [
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
] as const;

for (const path of WORKFLOWS) {
  void test(`${path} is valid YAML`, () => {
    const source = fs.readFileSync(path, "utf8");
    const document = parseDocument(source, { uniqueKeys: true });
    assert.deepEqual(
      document.errors,
      [],
      document.errors.map((error) => error.message).join("\n"),
    );
  });

  void test(`${path} does not persist checkout credentials`, () => {
    const source = fs.readFileSync(path, "utf8");
    assert.match(source, /persist-credentials: false/);
  });
}

void test("prerelease CI cancels superseded verification runs", () => {
  const source = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(source, /concurrency:/);
  assert.match(source, /github\.event\.pull_request\.number \|\| github\.ref/);
  assert.match(source, /cancel-in-progress: true/);
});

void test("prerelease CI publishes a short-lived smoke-test bundle", () => {
  const source = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(source, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(source, /github\.ref == 'refs\/heads\/prerelease'/);
  assert.match(source, /retention-days: 7/);
  for (const artifact of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(source, new RegExp(`\\b${artifact.replace(".", "\\.")}\\b`));
  }
});

void test("release workflow verifies and publishes the required artifacts", () => {
  const source = fs.readFileSync(".github/workflows/release.yml", "utf8");
  assert.match(source, /Verify release tag/);
  assert.match(source, /fetch-depth: 0/);
  assert.match(source, /Verify release source/);
  assert.match(source, /merge-base --is-ancestor "\$GITHUB_SHA" origin\/main/);
  assert.match(source, /actions\/attest@1e69f48acb82d1966a394da916b4c1698aa569d6/);
  for (const artifact of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(source, new RegExp(`\\b${artifact.replace(".", "\\.")}\\b`));
  }
});
