import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

const forbiddenTransports = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\s*\(/,
  /\brequest\s*\(/,
  /from\s+["'](?:node:)?(?:http|https|net|tls|dns|dgram)["']/,
  /from\s+["']electron["']/,
  /from\s+["'](?:axios|got|undici|node-fetch)["']/,
];

void test("network access is isolated to the optional Wallhaven importer", () => {
  const allowed = new Set([
    path.normalize("src/wallhaven-client.ts"),
    path.normalize("src/wallhaven-download.ts"),
  ]);
  const localRuntime = sourceFiles("src")
    .filter((file) => !allowed.has(path.normalize(file)))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  for (const forbidden of [...forbiddenTransports, /\brequestUrl\s*\(/]) {
    assert.doesNotMatch(localRuntime, forbidden);
  }
});

void test("Wallhaven importer uses Obsidian requestUrl without other network transports", () => {
  const networkSource = ["src/wallhaven-client.ts", "src/wallhaven-download.ts"]
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  assert.match(networkSource, /import \{[^}]*requestUrl[^}]*\} from "obsidian"/s);
  assert.match(networkSource, /\brequestUrl\s*\(/);
  for (const forbidden of forbiddenTransports) assert.doesNotMatch(networkSource, forbidden);
  assert.doesNotMatch(networkSource, /\bapikey\b/i);
});

void test("Wallhaven downloads become vault-local files before selection", () => {
  const download = fs.readFileSync("src/wallhaven-download.ts", "utf8");
  const library = fs.readFileSync("src/wallpaper-library-modal.ts", "utf8");
  assert.match(download, /vault\.createBinary\(localPath, response\.arrayBuffer\)/);
  assert.match(library, /await importWallhavenWallpaper\(this\.app\.vault, wallpaper\)/);
  assert.match(library, /this\.controller\.selectWallpaper\(targetId, file\.path\)/);
  assert.doesNotMatch(fs.readFileSync("src/main.ts", "utf8"), /wallhaven/i);
});

void test("README discloses optional Wallhaven network use and local playback", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  assert.match(readme, /Wallhaven/);
  assert.match(readme, /only when you use the optional Wallhaven browser/i);
  assert.match(readme, /saved inside your vault/i);
  assert.match(readme, /does not collect telemetry or run analytics/i);
});
