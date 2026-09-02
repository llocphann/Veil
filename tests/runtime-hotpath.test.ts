import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

void test("metadata cache changes skip active-file work before layout is ready", () => {
  assert.match(
    source,
    /metadataCache\.on\("changed", \(file\) => \{\s*if \(!this\.layoutReady\) return;\s*if \(this\.isActiveFile\(file\)\)/,
  );
});

void test("note contexts and active-file checks share the cheap file lookup", () => {
  assert.match(source, /private fileForDocument\(document: Document\): TFile \| null/);
  assert.match(
    source,
    /private contextForDocument\(document: Document\): NoteContext \| null \{\s*const candidate = this\.fileForDocument\(document\);/,
  );
  assert.match(
    source,
    /if \(this\.fileForDocument\(document\)\?\.path === file\.path\) return true;/,
  );
  const activeFileBody = source.match(
    /private isActiveFile\(file: TFile\): boolean \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.doesNotMatch(activeFileBody, /contextForDocument/);
  assert.doesNotMatch(activeFileBody, /metadataCache/);
});

void test("settings changes retain unrelated wallpaper pool candidate caches", () => {
  const updateSettingsBody = source.match(
    /public updateSettings\([\s\S]*?\n\s{2}public flushSettings\(/,
  )?.[0] || "";
  assert.match(updateSettingsBody, /staleWallpaperPoolCandidateCacheKeys\(previous, next\)/);
  assert.match(updateSettingsBody, /this\.poolCandidates\.delete\(key\)/);
  assert.doesNotMatch(updateSettingsBody, /this\.poolCandidates\.clear\(\)/);
});
