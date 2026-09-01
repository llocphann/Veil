import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseDocument } from "yaml";

const source = fs.readFileSync(".github/dependabot.yml", "utf8");
const document = parseDocument(source, { uniqueKeys: true });

void test("Dependabot configuration is valid YAML", () => {
  assert.deepEqual(
    document.errors,
    [],
    document.errors.map((error) => error.message).join("\n"),
  );
});

void test("Dependabot tracks pinned GitHub Actions weekly", () => {
  assert.match(source, /package-ecosystem: "github-actions"/);
  assert.match(source, /directory: "\/"/);
  assert.match(source, /interval: "weekly"/);
});
