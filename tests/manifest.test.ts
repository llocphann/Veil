import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

interface Manifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  fundingUrl: string;
  isDesktopOnly: boolean;
}

void test("manifest is ready for a Community Plugins submission", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8")) as Manifest;
  const versions = JSON.parse(fs.readFileSync("versions.json", "utf8")) as Record<string, string>;
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
    version: string;
    license: string;
  };

  assert.equal(manifest.id, "veil");
  assert.equal(manifest.name, "Veil");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(packageJson.license, "GPL-3.0-only");
  assert.equal(manifest.minAppVersion, "1.13.7");
  assert.equal(manifest.fundingUrl, "https://www.buymeacoffee.com/llocphann");
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  assert.equal(manifest.isDesktopOnly, true);
  assert.ok(manifest.description.length <= 250);
  assert.match(manifest.description, /\.$/);
});

void test("release files and required repository documents exist", () => {
  for (const path of [
    "manifest.json",
    "styles.css",
    "README.md",
    "LICENSE",
    "assets/buy-me-a-coffee.svg",
  ]) {
    assert.equal(fs.existsSync(path), true, `${path} is required`);
  }

  const license = fs.readFileSync("LICENSE", "utf8");
  assert.match(license, /^GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007/);
  assert.doesNotMatch(license, /^(<<<<<<<|=======|>>>>>>>)/m);

  const readme = fs.readFileSync("README.md", "utf8");
  assert.match(readme, /https:\/\/www\.buymeacoffee\.com\/llocphann/);
  assert.match(readme, /assets\/buy-me-a-coffee\.svg/);
  assert.match(readme, /\.obsidian\/plugins\/veil\//);
  assert.doesNotMatch(readme, /\.obsidian\/plugins\/vault-dashboard-background\//);
  assert.doesNotMatch(readme, /<script\b/i);
});
