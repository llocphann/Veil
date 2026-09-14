import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseDocument } from "yaml";

const WORKFLOWS = [
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  ".github/workflows/stable-release.yml",
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

void test("verification and release jobs have bounded runtimes", () => {
  const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  const release = fs.readFileSync(".github/workflows/release.yml", "utf8");
  const stableRelease = fs.readFileSync(".github/workflows/stable-release.yml", "utf8");
  assert.equal(ci.split("timeout-minutes: 10").length - 1, 1);
  assert.equal(release.split("timeout-minutes: 10").length - 1, 2);
  assert.equal(stableRelease.split("timeout-minutes: 10").length - 1, 3);
});

void test("development CI verifies dev and prerelease without duplicating stable release verification", () => {
  const source = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(source, /concurrency:/);
  assert.match(source, /github\.event\.pull_request\.number \|\| github\.ref/);
  assert.match(source, /cancel-in-progress: true/);
  assert.match(source, /branches:\n[ ]{6}- dev\n[ ]{6}- prerelease/);
  assert.doesNotMatch(source, /[ ]{6}- main\b/);
  assert.doesNotMatch(source, /[ ]{6}- stable\b/);
  assert.doesNotMatch(source, /contents: write/);
});

void test("only prerelease publishes a short-lived manual smoke-test bundle", () => {
  const source = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(source, /Upload prerelease smoke-test bundle/);
  assert.match(source, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(source, /github\.ref == 'refs\/heads\/prerelease'/);
  assert.doesNotMatch(source, /github\.ref == 'refs\/heads\/dev'/);
  assert.match(source, /veil-smoke-prerelease-/);
  assert.match(source, /retention-days: 7/);
  for (const artifact of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(source, new RegExp(`\\b${artifact.replace(".", "\\.")}\\b`));
  }
});

void test("release workflow verifies and publishes the required artifacts from stable", () => {
  const source = fs.readFileSync(".github/workflows/release.yml", "utf8");
  assert.match(source, /Verify release tag/);
  assert.match(source, /fetch-depth: 0/);
  assert.match(source, /Verify release source/);
  assert.match(source, /merge-base --is-ancestor "\$GITHUB_SHA" origin\/stable/);
  assert.match(source, /actions\/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a/);
  assert.match(source, /actions\/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131/);
  assert.match(source, /actions\/attest@1e69f48acb82d1966a394da916b4c1698aa569d6/);
  assert.match(source, /gh release create/);
  assert.doesNotMatch(source, /--draft/);
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

void test("stable promotion accepts only the smoke-tested prerelease source before release writes", () => {
  const source = fs.readFileSync(".github/workflows/stable-release.yml", "utf8");
  const verifyIndex = source.indexOf("  verify:\n");
  const versionIndex = source.indexOf("  version:\n");
  const publishIndex = source.indexOf("  publish:\n");
  const provenanceIndex = source.indexOf("- name: Verify prerelease promotion source");
  const installIndex = source.indexOf("- name: Install dependencies");
  assert.ok(verifyIndex >= 0, "stable verification job is missing");
  assert.ok(versionIndex > verifyIndex, "stable version job must follow verification");
  assert.ok(publishIndex > versionIndex, "stable publish job must follow versioning");
  assert.ok(provenanceIndex >= 0, "prerelease provenance verification is missing");
  assert.ok(provenanceIndex < installIndex, "prerelease provenance must be checked before npm ci");
  assert.match(source, /branches:\n[ ]{6}- stable/);
  assert.match(source, /github\.actor != 'github-actions\[bot\]'/);
  assert.match(source, /git fetch --no-tags origin prerelease:refs\/remotes\/origin\/prerelease/);
  assert.match(source, /merge-base --is-ancestor "\$\{PRERELEASE_SHA\}" "\$\{GITHUB_SHA\}"/);
  assert.match(source, /PRERELEASE_TREE=/);
  assert.match(source, /STABLE_TREE=/);
  assert.match(source, /Stable source must exactly match the smoke-tested prerelease tree/);

  const verifyJob = source.slice(verifyIndex, versionIndex);
  const versionJob = source.slice(versionIndex, publishIndex);
  const publishJob = source.slice(publishIndex);
  assert.match(verifyJob, /permissions:\n[ ]{6}contents: read/);
  assert.match(verifyJob, /npm ci/);
  assert.match(verifyJob, /npm run check/);
  assert.match(verifyJob, /veil-stable-runtime-/);

  assert.match(versionJob, /needs: verify/);
  assert.match(versionJob, /permissions:\n[ ]{6}contents: write/);
  assert.doesNotMatch(versionJob, /npm ci|npm run check/);
  assert.match(versionJob, /npm version patch --no-git-tag-version --ignore-scripts/);
  assert.match(versionJob, /node version-bump\.mjs/);
  assert.match(versionJob, /gh release view/);
  assert.match(versionJob, /git push origin HEAD:stable/);
  assert.match(versionJob, /git push origin "\$\{VERSION\}"/);
  assert.match(versionJob, /veil-stable-manifest-/);

  assert.match(publishJob, /needs:/);
  assert.match(publishJob, /- verify/);
  assert.match(publishJob, /- version/);
  assert.match(publishJob, /contents: write/);
  assert.match(publishJob, /id-token: write/);
  assert.match(publishJob, /attestations: write/);
  assert.match(publishJob, /actions\/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131/);
  assert.match(publishJob, /actions\/attest@1e69f48acb82d1966a394da916b4c1698aa569d6/);
  assert.match(publishJob, /gh release create/);
  assert.doesNotMatch(publishJob, /npm ci|npm run check|Check out promoted source/);
});
