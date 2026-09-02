import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/wallpaper-library-modal.ts", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

void test("wallpaper cards override fixed Obsidian button dimensions", () => {
  assert.match(source, /select\.style\.height = "auto"/);
  assert.match(source, /select\.style\.minHeight = "0"/);
  assert.match(source, /select\.style\.maxHeight = "none"/);
  assert.match(source, /select\.style\.whiteSpace = "normal"/);
  assert.match(source, /preview\.style\.flex = "0 0 auto"/);
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
