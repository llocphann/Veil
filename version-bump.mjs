import fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));

const nextVersion = packageJson.version;
const nextMinAppVersion = manifest.minAppVersion;
const existingMinAppVersion = versions[nextVersion];
if (existingMinAppVersion !== undefined && existingMinAppVersion !== nextMinAppVersion) {
  throw new Error(
    `versions.json already maps ${nextVersion} to ${existingMinAppVersion}; refusing to rewrite release history as ${nextMinAppVersion}.`,
  );
}

manifest.version = nextVersion;
versions[nextVersion] = nextMinAppVersion;

fs.writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync("versions.json", `${JSON.stringify(versions, null, 2)}\n`);
