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
const applySchedulerSource = fs.readFileSync(
  new URL("../src/document-apply-scheduler.ts", import.meta.url),
  "utf8",
);

void test("metadata cache changes invalidate only documents using that file", () => {
  assert.match(
    source,
    /metadataCache\.on\("changed", \(file\) => \{\s*if \(!this\.layoutReady\) return;\s*this\.scheduleApplyToDocuments\(this\.documentContexts\.documentsForFile\(file\)\);/,
  );
  assert.doesNotMatch(
    source,
    /metadataCache\.on\("changed"[\s\S]*?isActiveFile\(file\)[\s\S]*?refreshWallpaper\(\)/,
  );
});

void test("active note events use document-scoped scheduling", () => {
  assert.match(
    source,
    /active-leaf-change[\s\S]*?rememberActiveRootLeaf\(leaf\)[\s\S]*?scheduleApplyToDocuments\(\[document\]\)/,
  );
  assert.match(source, /file-open", \(\) => this\.refreshMostRecentDocument\(\)/);
  assert.match(
    source,
    /refreshMostRecentDocument\(\)[\s\S]*?scheduleApplyToDocuments\(\[document\]\)/,
  );
});

void test("document context scope shares the cheap file lookup", () => {
  assert.match(contextSource, /private fileForDocument\(document: Document\): TFile \| null/);
  assert.match(
    contextSource,
    /contextForDocument\(document: Document\): NoteContext \{\s*const candidate = this\.fileForDocument\(document\);/,
  );
  assert.match(
    contextSource,
    /documentsForFile\(file: TFile\): Document\[\] \{[\s\S]*?this\.fileForDocument\(document\)\?\.path === file\.path/,
  );
  assert.match(
    contextSource,
    /isActiveFile\(file: TFile\): boolean \{\s*return this\.documentsForFile\(file\)\.length > 0;/,
  );
  const documentsForFileBody = contextSource.match(
    /documentsForFile\(file: TFile\): Document\[\] \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.doesNotMatch(documentsForFileBody, /contextForDocument/);
  assert.doesNotMatch(documentsForFileBody, /metadataCache/);
});

void test("broad document apply scheduling dominates targeted requests", () => {
  assert.match(applySchedulerSource, /private applyAllRequested = false/);
  assert.match(
    applySchedulerSource,
    /scheduleAll\(\): void \{[\s\S]*?this\.applyAllRequested = true;[\s\S]*?this\.pendingDocuments\.clear\(\);/,
  );
  assert.match(
    applySchedulerSource,
    /scheduleDocuments\(documents: Iterable<Document>\): void \{\s*if \(!this\.isActive\(\) \|\| this\.applyAllRequested\) return;/,
  );
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
