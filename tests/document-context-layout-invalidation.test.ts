import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/document-context-resolver.ts", import.meta.url),
  "utf8",
);

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
