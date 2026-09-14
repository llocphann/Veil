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
  const body = source.match(
    /metadataCache\.on\("changed", \(file\) => \{([\s\S]*?)\n {6}\}\)/,
  )?.[1] || "";
  const lookupIndex = body.indexOf("this.documentContexts.documentsForFile(file)");
  const invalidateIndex = body.indexOf("this.documentContexts.invalidateDocuments(documents)");
  const scheduleIndex = body.indexOf("this.scheduleApplyToDocuments(documents)");
  assert.match(body, /if \(!this\.layoutReady\) return/);
  assert.ok(lookupIndex >= 0);
  assert.ok(invalidateIndex > lookupIndex);
  assert.ok(scheduleIndex > invalidateIndex);
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

void test("document context scope reuses cached context before cheap file lookup", () => {
  assert.match(contextSource, /private fileForDocument\(document: Document\): TFile \| null/);
  const contextBody = contextSource.match(
    /contextForDocument\(document: Document\): NoteContext \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  const cacheIndex = contextBody.indexOf("const cached = this.contextCache.get(document);");
  const returnIndex = contextBody.indexOf("if (cached) return cached;");
  const lookupIndex = contextBody.indexOf("const candidate = this.fileForDocument(document);");
  assert.ok(cacheIndex >= 0);
  assert.ok(returnIndex > cacheIndex);
  assert.ok(lookupIndex > returnIndex);

  assert.match(
    contextSource,
    /documentsForFile\(file: TFile\): Document\[\] \{[\s\S]*?const cached = this\.contextCache\.get\(document\)[\s\S]*?if \(cached\) return cached\.path === file\.path[\s\S]*?this\.fileForDocument\(document\)\?\.path === file\.path/,
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
