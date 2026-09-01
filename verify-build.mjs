import fs from "node:fs";

const BUNDLE_BUDGET = 512 * 1024;
const STYLES_BUDGET = 256 * 1024;
const MANIFEST_BUDGET = 64 * 1024;
const GENERATED_BANNER = "/* Veil for Obsidian — generated from TypeScript source. */";

function requireFile(path, maximumBytes) {
  const stat = fs.statSync(path);
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`${path} must be a non-empty file.`);
  }
  if (stat.size > maximumBytes) {
    throw new Error(`${path} is ${stat.size} bytes, above the ${maximumBytes}-byte release budget.`);
  }
  return fs.readFileSync(path, "utf8");
}

const bundle = requireFile("main.js", BUNDLE_BUDGET);
requireFile("styles.css", STYLES_BUDGET);
const manifestText = requireFile("manifest.json", MANIFEST_BUDGET);
const manifest = JSON.parse(manifestText);

if (!bundle.startsWith(GENERATED_BANNER)) {
  throw new Error("main.js is missing the generated Veil production banner.");
}
if (/sourceMappingURL\s*=/.test(bundle)) {
  throw new Error("Production main.js must not contain an inline or external source map reference.");
}
if (manifest.id !== "veil" || manifest.name !== "Veil") {
  throw new Error("manifest.json does not identify the Veil plugin.");
}
if (manifest.isDesktopOnly !== true) {
  throw new Error("Veil prerelease must remain desktop-only until mobile support is designed explicitly.");
}

console.log(`Verified Veil release bundle: ${Buffer.byteLength(bundle)} bytes of JavaScript.`);
