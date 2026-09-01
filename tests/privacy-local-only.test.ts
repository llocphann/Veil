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

void test("Veil runtime remains vault-local and does not add network or telemetry transports", () => {
  const source = sourceFiles("src")
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  for (const forbidden of [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /\bsendBeacon\s*\(/,
    /\brequestUrl\s*\(/,
    /\brequest\s*\(/,
    /from\s+["'](?:node:)?(?:http|https|net|tls|dns|dgram)["']/,
    /from\s+["']electron["']/,
    /from\s+["'](?:axios|got|undici|node-fetch)["']/,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});
