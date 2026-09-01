import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

interface LockPackage {
  version?: string;
  hasInstallScript?: boolean;
}

interface PackageLock {
  packages?: Record<string, LockPackage>;
}

interface PackageManifest {
  allowScripts?: Record<string, boolean>;
}

function dependencyName(lockPath: string): string | null {
  const marker = "node_modules/";
  const index = lockPath.lastIndexOf(marker);
  return index >= 0 ? lockPath.slice(index + marker.length) : null;
}

void test("every dependency install script is explicitly approved at its locked version", () => {
  const manifest = JSON.parse(fs.readFileSync("package.json", "utf8")) as PackageManifest;
  const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8")) as PackageLock;

  const lockedInstallScripts = new Set<string>();
  for (const [lockPath, entry] of Object.entries(lock.packages ?? {})) {
    if (!entry.hasInstallScript || !entry.version) continue;
    const name = dependencyName(lockPath);
    assert.ok(name, `could not resolve package name for ${lockPath}`);
    lockedInstallScripts.add(`${name}@${entry.version}`);
  }

  const approvals = manifest.allowScripts ?? {};
  assert.ok(
    Object.values(approvals).every((approved) => approved === true),
    "install-script policy must use explicit version-pinned approvals only",
  );
  assert.deepEqual(
    Object.keys(approvals).sort(),
    [...lockedInstallScripts].sort(),
    "package.json allowScripts must exactly match dependencies with install scripts in package-lock.json",
  );
});
