import fs from "node:fs";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));

if (!isRecord(manifest)) throw new Error("manifest.json must contain an object.");
if (!isRecord(packageJson)) throw new Error("package.json must contain an object.");
if (!isRecord(versions)) throw new Error("versions.json must contain an object.");

const nextVersion = requiredString(packageJson.version, "package.json version");
const nextMinAppVersion = requiredString(manifest.minAppVersion, "manifest.json minAppVersion");
const existingMinAppVersion = versions[nextVersion];
if (existingMinAppVersion !== undefined && existingMinAppVersion !== nextMinAppVersion) {
  throw new Error(
    `versions.json already maps ${nextVersion} to ${String(existingMinAppVersion)}; refusing to rewrite release history as ${nextMinAppVersion}.`,
  );
}

manifest.version = nextVersion;
versions[nextVersion] = nextMinAppVersion;

fs.writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync("versions.json", `${JSON.stringify(versions, null, 2)}\n`);
