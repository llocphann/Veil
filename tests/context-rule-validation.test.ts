import assert from "node:assert/strict";
import test from "node:test";
import { contextRuleSyntaxValid } from "../src/context-rules";
import type { MatchType } from "../src/settings";

function valid(matchType: MatchType, matchValue: string): boolean {
  return contextRuleSyntaxValid({ matchType, matchValue });
}

void test("ordinary context rules require a non-empty match value", () => {
  for (const matchType of ["note", "path", "folder", "tag"] as const) {
    assert.equal(valid(matchType, "value"), true, matchType);
    assert.equal(valid(matchType, "   "), false, matchType);
  }
});

void test("frontmatter property syntax requires a property key", () => {
  assert.equal(valid("property", "veil"), true);
  assert.equal(valid("property", "veil=focus"), true);
  assert.equal(valid("property", "veil="), true);
  assert.equal(valid("property", "=focus"), false);
});

void test("supported system-context expressions validate with runtime parsers", () => {
  for (const value of [
    "@theme=dark",
    "@theme=light",
    "@time=22:00-06:00",
    "@time=08:00-08:00",
    "@day=weekday",
    "@day=fri-mon",
    "@schedule=mon-fri 08:00-18:00",
    "@schedule=weekend 22:00-06:00",
  ]) {
    assert.equal(valid("property", value), true, value);
  }
});

void test("malformed or unknown system-context expressions are invalid", () => {
  for (const value of [
    "@theme",
    "@theme=blue",
    "@time=25:00-06:00",
    "@time=22:00",
    "@day=funday",
    "@schedule=mon-fri",
    "@schedule=funday 08:00-18:00",
    "@unknown=value",
  ]) {
    assert.equal(valid("property", value), false, value);
  }
});
