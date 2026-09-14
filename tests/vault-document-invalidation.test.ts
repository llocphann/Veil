import assert from "node:assert/strict";
import test from "node:test";
import {
  vaultChangeAffectsDocument,
  vaultPathTouches,
} from "../src/vault-document-invalidation";

void test("vault path matching covers exact files and changed parent folders", () => {
  assert.equal(vaultPathTouches("Wallpapers/a.webp", "Wallpapers/a.webp"), true);
  assert.equal(vaultPathTouches("Wallpapers/Nature/a.webp", "Wallpapers/Nature"), true);
  assert.equal(vaultPathTouches("Wallpapers/Nature/a.webp", "Wallpapers/Other"), false);
  assert.equal(vaultPathTouches("", "Wallpapers"), false);
});

void test("loaded pool selections invalidate even when configured anchor differs", () => {
  assert.equal(
    vaultChangeAffectsDocument(
      "Wallpapers/b.webp",
      "Wallpapers/b.webp",
      "Wallpapers/a.webp",
    ),
    true,
  );
});

void test("missing configured sources can wake when their vault path appears", () => {
  assert.equal(
    vaultChangeAffectsDocument(
      "Wallpapers/a.webp",
      "",
      "Wallpapers/a.webp",
    ),
    true,
  );
});

void test("unrelated vault changes stay outside document invalidation", () => {
  assert.equal(
    vaultChangeAffectsDocument(
      "Attachments/image.png",
      "Wallpapers/b.webp",
      "Wallpapers/a.webp",
    ),
    false,
  );
});
