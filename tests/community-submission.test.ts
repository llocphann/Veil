import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

interface Manifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  fundingUrl?: string | Record<string, string>;
  isDesktopOnly: boolean;
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8")) as Manifest;

void test("community submission root files are present", () => {
  for (const path of ["README.md", "LICENSE", "manifest.json"]) {
    assert.ok(fs.existsSync(path), `${path} is required for Community Plugins submission`);
  }
});

void test("manifest follows current Community Plugins naming and description rules", () => {
  assert.match(manifest.id, /^[a-z]+(?:-[a-z]+)*$/);
  assert.ok(!manifest.id.includes("obsidian"), "plugin id must not contain obsidian");
  assert.ok(!manifest.id.endsWith("plugin"), "plugin id must not end with plugin");
  assert.ok(manifest.name.length > 0, "plugin name is required");
  assert.ok(!/obsidian/i.test(manifest.name), "plugin name must not include Obsidian");
  assert.ok(!/plugin/i.test(manifest.name), "plugin name must not include Plugin");
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.match(manifest.minAppVersion, /^\d+\.\d+\.\d+$/);
  assert.ok(manifest.description.length > 0 && manifest.description.length <= 250);
  assert.ok(manifest.description.endsWith("."), "plugin description must end with a period");
  assert.ok(!/^this is a plugin\b/i.test(manifest.description));
  assert.ok(manifest.author.trim().length > 0, "plugin author is required");
  assert.equal(manifest.isDesktopOnly, true);
});

void test("funding metadata is used only as an HTTPS support link", () => {
  if (manifest.fundingUrl === undefined) return;
  const urls = typeof manifest.fundingUrl === "string"
    ? [manifest.fundingUrl]
    : Object.values(manifest.fundingUrl);
  assert.ok(urls.length > 0);
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.protocol, "https:");
  }
});

void test("commands do not ship default hotkeys", () => {
  const source = fs.readFileSync("src/main.ts", "utf8");
  assert.doesNotMatch(source, /\bhotkeys\s*:/);
});

void test("generated main.js is not committed to the source repository", () => {
  const result = spawnSync("git", ["ls-files", "--", "main.js"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "");
});
