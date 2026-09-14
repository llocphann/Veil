import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/wallpaper-library-modal.ts", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

void test("wallpaper cards override fixed Obsidian button dimensions", () => {
  assert.match(
    source,
    /select\.setCssStyles\(\{[\s\S]*?height: "auto"[\s\S]*?minHeight: "0"[\s\S]*?maxHeight: "none"[\s\S]*?whiteSpace: "normal"/,
  );
  assert.match(source, /preview\.setCssStyles\(\{ flex: "0 0 auto" \}\)/);
  assert.doesNotMatch(source, /select\.style\.|preview\.style\./);
});

void test("wallpaper thumbnails retain a stable preview ratio and crop mode", () => {
  assert.match(
    styles,
    /\.veil-wallpaper-library-preview\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*10;/,
  );
  assert.match(
    styles,
    /\.veil-wallpaper-library-preview\s*>\s*img\s*\{[\s\S]*?object-fit:\s*cover;/,
  );
});
