import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resolverSource = readFileSync(
  new URL("../src/document-context-resolver.ts", import.meta.url),
  "utf8",
);
const mainSource = readFileSync(
  new URL("../src/main.ts", import.meta.url),
  "utf8",
);

void test("cached document context returns before leaf and metadata work", () => {
  const body = resolverSource.match(
    /contextForDocument\(document: Document\): NoteContext \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  const cacheIndex = body.indexOf("const cached = this.contextCache.get(document);");
  const returnIndex = body.indexOf("if (cached) return cached;");
  const fileIndex = body.indexOf("const candidate = this.fileForDocument(document);");
  const storeIndex = body.indexOf("this.contextCache.set(document, context);");

  assert.ok(cacheIndex >= 0);
  assert.ok(returnIndex > cacheIndex && fileIndex > returnIndex);
  assert.ok(storeIndex > fileIndex);
  assert.doesNotMatch(body.slice(0, fileIndex), /getFileCache|getAllTags/);
});

void test("metadata extraction is isolated behind the cache miss path", () => {
  const body = resolverSource.match(
    /private contextForFile\([\s\S]*?\): NoteContext \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(body, /this\.app\.metadataCache\.getFileCache\(candidate\)/);
  assert.match(body, /getAllTags\(cache\)/);
  assert.equal(
    (resolverSource.match(/metadataCache\.getFileCache/g) || []).length,
    1,
  );
});

void test("active leaf, layout repair, close, and teardown invalidate cached context", () => {
  const activeBody = resolverSource.match(
    /rememberActiveRootLeaf\([\s\S]*?\): Document \| null \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(activeBody, /this\.invalidateDocument\(document\)/);

  const layoutBody = resolverSource.match(
    /documentsAffectedByLayoutChange\(\): Document\[] \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(layoutBody, /this\.invalidateDocument\(document\)/);

  const forgetBody = resolverSource.match(
    /forgetDocument\(document: Document\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(forgetBody, /this\.contextCache\.delete\(document\)/);

  const clearBody = resolverSource.match(/clear\(\): void \{([\s\S]*?)\n {2}\}/)?.[1] || "";
  assert.match(clearBody, /this\.contextCache\.clear\(\)/);
});

void test("file lookup can reuse cached path without resolving the root leaf again", () => {
  const body = resolverSource.match(
    /documentsForFile\(file: TFile\): Document\[] \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(body, /const cached = this\.contextCache\.get\(document\)/);
  assert.match(body, /if \(cached\) return cached\.path === file\.path/);
  assert.match(body, /this\.fileForDocument\(document\)\?\.path === file\.path/);
});

void test("metadata events invalidate affected documents before scheduling apply", () => {
  const body = mainSource.match(
    /metadataCache\.on\("changed", \(file\) => \{([\s\S]*?)\n {6}\}\)/,
  )?.[1] || "";
  const lookupIndex = body.indexOf("this.documentContexts.documentsForFile(file)");
  const invalidateIndex = body.indexOf("this.documentContexts.invalidateDocuments(documents)");
  const scheduleIndex = body.indexOf("this.scheduleApplyToDocuments(documents)");
  assert.ok(lookupIndex >= 0);
  assert.ok(invalidateIndex > lookupIndex && scheduleIndex > invalidateIndex);
});

void test("theme and rename events explicitly invalidate cached semantic context", () => {
  const cssBody = mainSource.match(
    /workspace\.on\("css-change", \(\) => \{([\s\S]*?)\n {4}\}\)\)/,
  )?.[1] || "";
  const invalidateIndex = cssBody.indexOf("this.documentContexts.invalidateAllContexts();");
  const themeGateIndex = cssBody.indexOf("contextRulesDependOnTheme");
  assert.ok(invalidateIndex >= 0 && themeGateIndex > invalidateIndex);

  const renameBody = mainSource.match(
    /vault\.on\("rename", \(file, oldPath\) => \{([\s\S]*?)\n {6}\}\)/,
  )?.[1] || "";
  const affectedIndex = renameBody.indexOf("this.documentsAffectedByVaultPath(oldPath)");
  const renameInvalidateIndex = renameBody.indexOf("this.documentContexts.invalidateAllContexts();");
  assert.ok(affectedIndex >= 0 && renameInvalidateIndex > affectedIndex);
});
