import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

function writeFixture(
  directory: string,
  packageVersion: string,
  manifestVersion: string,
  minAppVersion: string,
  versions: Record<string, string>,
): void {
  fs.writeFileSync(
    path.join(directory, "package.json"),
    `${JSON.stringify({ name: "veil-obsidian-plugin", version: packageVersion }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(directory, "manifest.json"),
    `${JSON.stringify({ id: "veil", version: manifestVersion, minAppVersion }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(directory, "versions.json"),
    `${JSON.stringify(versions, null, 2)}\n`,
  );
}

void test("version bump script updates manifest and versions without dropping history", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "veil-version-bump-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  writeFixture(directory, "1.4.0", "1.3.0", "1.13.7", { "1.3.0": "1.13.7" });

  const result = spawnSync(process.execPath, [path.resolve("version-bump.mjs")], {
    cwd: directory,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")) as {
    version: string;
    minAppVersion: string;
  };
  const versions = JSON.parse(fs.readFileSync(path.join(directory, "versions.json"), "utf8")) as Record<string, string>;

  assert.equal(manifest.version, "1.4.0");
  assert.equal(manifest.minAppVersion, "1.13.7");
  assert.equal(versions["1.3.0"], "1.13.7");
  assert.equal(versions["1.4.0"], "1.13.7");
});

void test("version bump script refuses to rewrite an existing version's app baseline", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "veil-version-bump-conflict-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  writeFixture(directory, "1.4.0", "1.3.0", "1.14.0", {
    "1.3.0": "1.13.7",
    "1.4.0": "1.13.7",
  });

  const beforeManifest = fs.readFileSync(path.join(directory, "manifest.json"), "utf8");
  const beforeVersions = fs.readFileSync(path.join(directory, "versions.json"), "utf8");
  const result = spawnSync(process.execPath, [path.resolve("version-bump.mjs")], {
    cwd: directory,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to rewrite release history/);
  assert.equal(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"), beforeManifest);
  assert.equal(fs.readFileSync(path.join(directory, "versions.json"), "utf8"), beforeVersions);
});
