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
  assert.match(
    readme,
    /https:\/\/raw\.githubusercontent\.com\/llocphann\/Veil\/main\/assets\/buy-me-a-coffee\.svg/,
  );
  assert.match(readme, /\.obsidian\/plugins\/veil\//);
  assert.doesNotMatch(readme, /\.obsidian\/plugins\/vault-dashboard-background\//);
  assert.doesNotMatch(readme, /<script\b/i);
});

void test("support button is branded and independent from theme button classes", () => {
  const source = fs.readFileSync("src/settings-tab.ts", "utf8");
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.match(source, /cls: "veil-support-link"/);
  assert.doesNotMatch(source, /mod-cta veil-support-link/);
  assert.match(source, /cls: "veil-support-link-label"/);
  assert.match(styles, /--veil-support-background: #fd0;/);
  assert.match(styles, /\.veil-support-link-label[\s\S]*white-space: nowrap;/);
});

void test("stylesheet avoids Community CSS lint warnings", () => {
  const styles = fs.readFileSync("styles.css", "utf8");

  assert.doesNotMatch(styles, /!important\b/);
  assert.doesNotMatch(styles, /:has\(/);
});

void test("context routing and opacity exclusions are documented and exposed in settings", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  const settings = fs.readFileSync("src/settings-tab.ts", "utf8");
  const runtime = fs.readFileSync("src/main.ts", "utf8");

  assert.match(readme, /Wallpaper routes are evaluated from top to bottom/);
  assert.match(readme, /Opacity exclusions are additive/);
  assert.match(settings, /heading: "Wallpaper routing"/);
  assert.match(settings, /heading: "Opacity exclusions"/);
  assert.match(runtime, /metadataCache\.on\("changed"/);
});
