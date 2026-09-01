import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

interface Manifest {
  version: string;
  minAppVersion: string;
}

interface PackageJson {
  version: string;
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8")) as Manifest;
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as PackageJson;
const packageLock = JSON.parse(fs.readFileSync("package-lock.json", "utf8")) as {
  version?: string;
  packages?: Record<string, { version?: string }>;
};
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8")) as Record<string, string>;
const changelog = fs.readFileSync("CHANGELOG.md", "utf8");

void test("package, lockfile, and manifest versions stay synchronized", () => {
  assert.equal(manifest.version, packageJson.version);
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages?.[""]?.version, packageJson.version);
});

void test("versions.json contains the current release metadata", () => {
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});

void test("changelog contains the current release version", () => {
  assert.match(changelog, new RegExp(`^## ${manifest.version.replaceAll(".", "\\.")}$`, "m"));
});
