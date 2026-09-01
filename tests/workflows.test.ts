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
}

void test("prerelease CI publishes a short-lived smoke-test bundle", () => {
  const source = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(source, /actions\/upload-artifact@v4/);
  assert.match(source, /github\.ref == 'refs\/heads\/prerelease'/);
  assert.match(source, /retention-days: 7/);
  for (const artifact of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(source, new RegExp(`\\b${artifact.replace(".", "\\.")}\\b`));
  }
});

void test("release workflow verifies and publishes the required artifacts", () => {
  const source = fs.readFileSync(".github/workflows/release.yml", "utf8");
  assert.match(source, /Verify release tag/);
  assert.match(source, /actions\/attest@v4/);
  for (const artifact of ["main.js", "manifest.json", "styles.css"]) {
    assert.match(source, new RegExp(`\\b${artifact.replace(".", "\\.")}\\b`));
  }
});
