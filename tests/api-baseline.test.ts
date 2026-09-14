import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

interface PackageLock {
  packages?: Record<string, { version?: string }>;
}

void test("CI builds against the reviewed Obsidian API baseline", () => {
  const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8")) as PackageLock;
  const obsidian = lock.packages?.["node_modules/obsidian"];

  assert.equal(
    obsidian?.version,
    "1.13.1",
    "Review API compatibility before changing the locked Obsidian typings version.",
  );
});

void test("declarative settings stay within the declared minimum app generation", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8")) as {
    minAppVersion: string;
  };
  const [major = 0, minor = 0] = manifest.minAppVersion.split(".").map(Number);

  assert.ok(
    major > 1 || (major === 1 && minor >= 13),
    "Veil's declarative settings require Obsidian 1.13.0 or newer.",
  );
});
