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

void test("wallpaper controls use grouped left alignment with a separate search row", () => {
  assert.match(
    styles,
    /\.veil-wallpaper-library-toolbar\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*flex-start;/,
  );
  assert.match(
    styles,
    /\.veil-wallpaper-library-toolbar:has\(> \.veil-wallpaper-library-search\)::after\s*\{[\s\S]*?order:\s*10;[\s\S]*?flex:\s*0 0 100%;/,
  );
  assert.match(
    styles,
    /\.veil-wallpaper-library-search\s*\{[\s\S]*?order:\s*20;[\s\S]*?margin-right:\s*auto;[\s\S]*?margin-left:\s*auto;/,
  );
  assert.match(
    styles,
    /\.veil-wallpaper-library-toolbar > select,[\s\S]*?\.veil-wallpaper-library-target\s*\{[\s\S]*?field-sizing:\s*content;/,
  );
  assert.match(
    styles,
    /\.veil-wallpaper-library-random\s*\{[\s\S]*?margin-left:\s*auto;/,
  );
  assert.doesNotMatch(styles, /\.veil-wallpaper-library-random\s*\{[^}]*min-width:/s);
  assert.doesNotMatch(styles, /\.veil-wallpaper-library-metadata-toggle\s*\{[^}]*min-width:/s);
});
