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
  assert.match(source, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
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
  assert.match(source, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(source, /actions\/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131/);
  assert.match(source, /actions\/attest@1e69f48acb82d1966a394da916b4c1698aa569d6/);
  for (const artifact of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(source, new RegExp(`\\b${artifact.replace(".", "\\.")}\\b`));
  }
});

void test("release source and tag are verified before repository dependencies execute", () => {
  const source = fs.readFileSync(".github/workflows/release.yml", "utf8");
  const verifyTag = source.indexOf("- name: Verify release tag");
  const verifySource = source.indexOf("- name: Verify release source");
  const install = source.indexOf("- name: Install dependencies");
  assert.ok(verifyTag >= 0, "release tag verification step is missing");
  assert.ok(verifySource >= 0, "release source verification step is missing");
  assert.ok(install >= 0, "dependency install step is missing");
  assert.ok(verifyTag < install, "release tag must be verified before npm ci");
  assert.ok(verifySource < install, "release source must be verified before npm ci");
});

void test("release publishing permissions are isolated from dependency execution", () => {
  const source = fs.readFileSync(".github/workflows/release.yml", "utf8");
  const verifyIndex = source.indexOf("  verify:\n");
  const publishIndex = source.indexOf("  publish:\n");
  assert.ok(verifyIndex >= 0, "read-only release verification job is missing");
  assert.ok(publishIndex > verifyIndex, "release publish job must follow verification");

  const verifyJob = source.slice(verifyIndex, publishIndex);
  const publishJob = source.slice(publishIndex);
  assert.ok(verifyJob.includes("permissions:\n      contents: read"));
  assert.doesNotMatch(verifyJob, /contents: write|id-token: write|attestations: write/);
  assert.match(publishJob, /needs: verify/);
  assert.match(publishJob, /contents: write/);
  assert.match(publishJob, /id-token: write/);
  assert.match(publishJob, /attestations: write/);
  assert.doesNotMatch(publishJob, /npm ci|Check out repository|Set up Node\.js/);
});
