import assert from "node:assert/strict";
import test from "node:test";
import { contextMatches, type NoteContext } from "../src/context-rules";
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
