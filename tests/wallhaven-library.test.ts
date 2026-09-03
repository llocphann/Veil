import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const library = fs.readFileSync("src/wallpaper-library-modal.ts", "utf8");
const download = fs.readFileSync("src/wallhaven-download.ts", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

void test("Wallhaven paging stays bound to the last explicit search", () => {
  assert.match(library, /wallhavenLastSearch/);
  assert.match(
    library,
    /append && this\.wallhavenLastSearch\s*\? this\.wallhavenLastSearch/,
  );
  assert.match(library, /searchWallhavenApi\(\{ \.\.\.options, page: nextPage \}\)/);
  assert.match(library, /if \(!append\) this\.wallhavenLastSearch = options;/);
});

void test("Wallhaven source does not search automatically when opened", () => {
  const renderSource = library.match(
    /private renderWallhavenSource\([\s\S]*?\n {2}private populateTargetSelect/,
  )?.[0] || "";
  assert.doesNotMatch(renderSource, /runWallhavenSearch\(false\)(?!;\s*\}\);)/);
  assert.match(renderSource, /addEventListener\("click", \(\) => \{\s*void this\.runWallhavenSearch\(false\);/);
});

void test("Wallhaven serializes full-resolution imports", () => {
  assert.match(library, /const downloadBusy = this\.wallhavenDownloading\.size > 0;/);
  assert.match(library, /select\.disabled = downloadBusy;/);
  assert.match(library, /if \(this\.wallhavenDownloading\.size > 0\) return;/);
  assert.match(download, /let activeWallhavenImport: Promise<TFile> \| null = null;/);
  assert.match(download, /if \(activeWallhavenImport\) \{/);
  assert.match(download, /activeWallhavenImport = operation;/);
  assert.match(download, /if \(activeWallhavenImport === operation\) activeWallhavenImport = null;/);
});

void test("Wallhaven completion cannot overwrite a newer target choice", () => {
  assert.match(library, /private targetSelectedPath\(targetId: string\): string \| null/);
  assert.match(library, /const expectedSelectedPath = this\.targetSelectedPath\(targetId\);/);
  assert.match(library, /const currentSelectedPath = this\.targetSelectedPath\(targetId\);/);
  assert.match(library, /currentSelectedPath !== expectedSelectedPath/);
  assert.match(library, /a newer wallpaper choice was kept/);
});

void test("Wallpaper Library toolbars can wrap on narrow windows", () => {
  assert.match(
    styles,
    /\.veil-wallpaper-library-toolbar\s*\{[^}]*flex-wrap:\s*wrap;/s,
  );
});
