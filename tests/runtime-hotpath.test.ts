import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const contextSource = fs.readFileSync(
  new URL("../src/document-context-resolver.ts", import.meta.url),
  "utf8",
);
const poolSource = fs.readFileSync(
  new URL("../src/wallpaper-pool-runtime.ts", import.meta.url),
  "utf8",
);

void test("metadata cache changes skip active-file work before layout is ready", () => {
  assert.match(
    source,
    /metadataCache\.on\("changed", \(file\) => \{\s*if \(!this\.layoutReady\) return;\s*if \(this\.documentContexts\.isActiveFile\(file\)\)/,
  );
});

void test("note contexts and active-file checks share the cheap file lookup", () => {
  assert.match(contextSource, /private fileForDocument\(document: Document\): TFile \| null/);
  assert.match(
    contextSource,
    /contextForDocument\(document: Document\): NoteContext \{\s*const candidate = this\.fileForDocument\(document\);/,
  );
  assert.match(
    contextSource,
    /if \(this\.fileForDocument\(document\)\?\.path === file\.path\) return true;/,
  );
  const activeFileBody = contextSource.match(
    /isActiveFile\(file: TFile\): boolean \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.doesNotMatch(activeFileBody, /contextForDocument/);
  assert.doesNotMatch(activeFileBody, /metadataCache/);
});

void test("settings changes retain unrelated wallpaper pool candidate caches", () => {
  assert.match(source, /wallpaperPools\.reconcileSettings\(previous, next, preservedPoolContexts\)/);
  const reconcileBody = poolSource.match(
    /reconcileSettings\([\s\S]*?\n\s{2}invalidateVaultEvent\(/,
  )?.[0] || "";
  assert.match(reconcileBody, /staleWallpaperPoolCandidateCacheKeys\(previous, next\)/);
  assert.match(reconcileBody, /this\.candidates\.delete\(key\)/);
  assert.doesNotMatch(reconcileBody, /this\.candidates\.clear\(\)/);
});
