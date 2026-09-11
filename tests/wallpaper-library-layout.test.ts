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

void test("wallpaper library uses a twenty-item five-column desktop page", () => {
  assert.match(source, /const WALLPAPERS_PER_PAGE = 20;/);
  assert.match(
    styles,
    /\.veil-wallpaper-library-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/,
  );
});

void test("wallpaper search occupies a centered row below the controls", () => {
  assert.match(
    styles,
    /\.veil-wallpaper-library-toolbar\s*\{[\s\S]*?grid-template-columns:\s*repeat\(6,\s*max-content\);/,
  );
  assert.match(
    styles,
    /\.veil-wallpaper-library-search\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;[\s\S]*?grid-row:\s*2;[\s\S]*?justify-self:\s*center;/,
  );
  assert.match(styles, /\.veil-wallpaper-library-random\s*\{[\s\S]*?min-width:\s*116px;/);
  assert.match(styles, /\.veil-wallpaper-library-metadata-toggle\s*\{[\s\S]*?min-width:\s*88px;/);
});
