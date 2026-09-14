import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const contextSource = readFileSync(
  new URL("../src/document-context-resolver.ts", import.meta.url),
  "utf8",
);

void test("main delegates document context ownership", () => {
  assert.match(mainSource, /new DocumentContextResolver\(this\.app\)/);
  assert.doesNotMatch(mainSource, /activeRootLeaves/);
  assert.match(contextSource, /private readonly activeRootLeaves/);
  assert.match(contextSource, /contextForDocument\(document: Document\)/);
  assert.match(contextSource, /isActiveFile\(file: TFile\)/);
});
