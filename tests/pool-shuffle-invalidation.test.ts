import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

void test("pool shuffle invalidates only documents using the selected pool context", () => {
  const body = source.match(
    /public shuffleWallpaperPool\(\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";

  assert.match(body, /const affectedDocuments = this\.documentsUsingPoolContext\(contextKey\)/);
  assert.match(body, /this\.wallpaperPools\.shuffle\(resolved\.appearance, contextKey\)/);
  assert.match(body, /scheduleApplyToDocuments\(affectedDocuments\)/);
  assert.doesNotMatch(body, /sourceRevision/);
  assert.doesNotMatch(body, /scheduleApplyToWorkspace/);
});

void test("pool context matching ignores documents outside the active pool", () => {
  const body = source.match(
    /private documentsUsingPoolContext\([\s\S]*?\n {2}private documentsAffectedByVaultPath/,
  )?.[0] || "";

  assert.match(body, /const poolAllowed = !resolved\.rule \|\| Boolean\(resolved\.profile\)/);
  assert.match(body, /!poolAllowed \|\| !resolved\.appearance\.wallpaperPoolEnabled/);
  assert.match(body, /if \(resolvedContextKey === contextKey\) affected\.add\(document\)/);
});
