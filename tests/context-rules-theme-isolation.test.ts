import assert from "node:assert/strict";
import test from "node:test";
import {
  contextMatches,
  contextRulesDependOnTheme,
  type NoteContext,
} from "../src/context-rules";
import type { WallpaperRule } from "../src/settings";

const darkRule: WallpaperRule = {
  id: "dark",
  enabled: true,
  matchType: "property",
  matchValue: "@theme=dark",
  profileId: "",
  wallpaperPath: "Media/dark.webp",
};

void test("theme fallbacks require the document-local theme context", () => {
  assert.equal(contextMatches(darkRule, null), false);

  const workspaceContext: NoteContext = {
    path: "",
    name: "",
    basename: "",
    tags: [],
    properties: {},
    theme: "dark",
  };
  assert.equal(contextMatches(darkRule, workspaceContext), true);
  assert.equal(contextMatches(darkRule, { ...workspaceContext, theme: "light" }), false);
});

void test("theme dependency detection includes only enabled valid theme rules", () => {
  assert.equal(contextRulesDependOnTheme([darkRule]), true);
  assert.equal(contextRulesDependOnTheme([{ ...darkRule, enabled: false }]), false);
  assert.equal(
    contextRulesDependOnTheme([{ ...darkRule, matchValue: "status=dark" }]),
    false,
  );
  assert.equal(
    contextRulesDependOnTheme([{ ...darkRule, matchValue: "@time=09:00-17:00" }]),
    false,
  );
  assert.equal(
    contextRulesDependOnTheme([{ ...darkRule, matchValue: "@theme=sepia" }]),
    false,
  );
});
