import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

interface Manifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  isDesktopOnly: boolean;
}

void test("manifest is ready for a Community Plugins submission", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8")) as Manifest;
  const versions = JSON.parse(fs.readFileSync("versions.json", "utf8")) as Record<string, string>;
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as { version: string };

  assert.equal(manifest.id, "vault-dashboard-background");
  assert.equal(manifest.name, "Veil");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  assert.equal(manifest.isDesktopOnly, true);
  assert.ok(manifest.description.length <= 250);
  assert.match(manifest.description, /\.$/);
});

void test("release files and required repository documents exist", () => {
  for (const path of ["manifest.json", "styles.css", "README.md", "LICENSE"]) {
    assert.equal(fs.existsSync(path), true, `${path} is required`);
  }
});
