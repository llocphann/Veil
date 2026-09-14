import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/document-context-resolver.ts", import.meta.url),
  "utf8",
);
const mainSource = readFileSync(
  new URL("../src/main.ts", import.meta.url),
  "utf8",
);

void test("workspace documents are discovered once and then kept in a live registry", () => {
  const initializeBody = source.match(
    /initializeDocuments\(\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(initializeBody, /this\.rememberDocument\(this\.app\.workspace\.containerEl\.ownerDocument\)/);
  assert.match(initializeBody, /this\.app\.workspace\.iterateAllLeaves/);
  assert.match(initializeBody, /this\.rememberDocument\(leaf\.view\.containerEl\.ownerDocument\)/);

  const exposedBody = source.match(
    /workspaceDocuments\(\): ReadonlySet<Document> \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(exposedBody, /return this\.workspaceDocumentRegistry/);

  const scanCount = (source.match(/iterateAllLeaves/g) || []).length;
  assert.equal(scanCount, 2, "only initial discovery and fallback root repair may scan all leaves");
});

void test("registry follows active roots and pop-out lifecycle", () => {
  const rememberRootBody = source.match(
    /rememberActiveRootLeaf\([\s\S]*?\): Document \| null \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(rememberRootBody, /this\.rememberDocument\(document\)/);

  const forgetBody = source.match(
    /forgetDocument\(document: Document\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(forgetBody, /this\.activeRootLeaves\.delete\(document\)/);
  assert.match(forgetBody, /this\.workspaceDocumentRegistry\.delete\(document\)/);
});

void test("file lookup and layout invalidation reuse the registry without rebuilding it", () => {
  const fileBody = source.match(
    /documentsForFile\(file: TFile\): Document\[] \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(fileBody, /Array\.from\(this\.workspaceDocumentRegistry\)/);
  assert.doesNotMatch(fileBody, /iterateAllLeaves/);

  const layoutBody = source.match(
    /documentsAffectedByLayoutChange\(\): Document\[] \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(layoutBody, /for \(const document of this\.workspaceDocumentRegistry\)/);
  assert.doesNotMatch(layoutBody, /iterateAllLeaves/);
});

void test("main runtime initializes and maintains the registry for pop-out windows", () => {
  assert.match(
    mainSource,
    /onLayoutReady\([\s\S]*?this\.documentContexts\.initializeDocuments\(\)/,
  );
  assert.match(
    mainSource,
    /window-open[\s\S]*?this\.documentContexts\.rememberDocument\(window\.document\)/,
  );
  assert.match(
    mainSource,
    /window-close[\s\S]*?this\.documentContexts\.forgetDocument\(window\.document\)/,
  );

  const workspaceBody = mainSource.match(
    /private workspaceDocuments\(\): ReadonlySet<Document> \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(workspaceBody, /return this\.documentContexts\.workspaceDocuments\(\)/);
  assert.doesNotMatch(mainSource, /iterateAllLeaves/);
});

void test("layout invalidation keeps valid remembered roots as a no-op", () => {
  const body = source.match(
    /documentsAffectedByLayoutChange\(\): Document\[] \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";

  assert.match(body, /const remembered = this\.activeRootLeaves\.get\(document\) \|\| null/);
  assert.match(body, /if \(this\.isRootLeafForDocument\(remembered, document\)\) continue/);
  assert.match(body, /const replacement = this\.findRootLeafForDocument\(document\)/);
  assert.match(body, /if \(replacement\) this\.activeRootLeaves\.set\(document, replacement\)/);
  assert.match(body, /if \(remembered \|\| replacement\) affected\.push\(document\)/);
});

void test("fallback root discovery is cached for later no-op context resolution", () => {
  const leafForDocument = source.match(
    /private leafForDocument\(document: Document\): WorkspaceLeaf \| null \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";

  assert.match(leafForDocument, /const replacement = this\.findRootLeafForDocument\(document\)/);
  assert.match(
    leafForDocument,
    /if \(replacement\) this\.activeRootLeaves\.set\(document, replacement\)/,
  );
  assert.match(leafForDocument, /return replacement/);
});
