import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/wallpaper-library-modal.ts", import.meta.url),
  "utf8",
);

void test("vault selection patches card state unless recent ordering must change", () => {
  const body = source.match(
    /private applyVaultSelection\([\s\S]*?\n {2}private updateVaultSelection/,
  )?.[0] || "";

  assert.match(body, /this\.controller\.selectWallpaper\(targetId, path\)/);
  assert.match(body, /if \(this\.view === "recent"\) \{[\s\S]*?this\.renderVaultGrid\(\)/);
  assert.match(body, /this\.updateVaultSelection\(path\)/);
  assert.equal((body.match(/this\.renderVaultGrid\(\)/g) || []).length, 1);
});

void test("vault selection state updates existing cards instead of rebuilding them", () => {
  const body = source.match(
    /private updateVaultSelection\([\s\S]*?\n {2}private updateFavoriteButton/,
  )?.[0] || "";

  assert.match(body, /querySelectorAll<HTMLElement>/);
  assert.match(body, /card\.dataset\.selected = String\(card\.dataset\.path === selectedPath\)/);
  assert.doesNotMatch(body, /renderVaultGrid/);
});

void test("favorite toggle rebuilds only the Favorites membership view", () => {
  const cardBody = source.match(
    /private renderCard\([\s\S]*?favoriteButton\.addEventListener\("click", \(\) => \{([\s\S]*?)\n {4}\}\);/,
  )?.[1] || "";

  assert.match(cardBody, /this\.controller\.toggleFavorite\(file\.path\)/);
  assert.match(cardBody, /if \(this\.view === "favorites"\) \{[\s\S]*?this\.renderVaultGrid\(\)/);
  assert.match(cardBody, /this\.updateFavoriteButton\(favoriteButton, file, nextFavorite\)/);
  assert.equal((cardBody.match(/this\.renderVaultGrid\(\)/g) || []).length, 1);
});

void test("random visible selection uses the same scoped selection path", () => {
  const body = source.match(
    /private selectRandomVisible\(\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";

  assert.match(body, /this\.applyVaultSelection\(target\.id, selected\.path\)/);
  assert.doesNotMatch(body, /this\.renderVaultGrid\(\)/);
});
