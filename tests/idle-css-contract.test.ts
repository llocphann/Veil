import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function declarationBlocks(property: string): Array<{ selector: string; body: string }> {
  const blocks: Array<{ selector: string; body: string }> = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of styles.matchAll(blockPattern)) {
    const selector = match[1]?.trim() || "";
    const body = match[2] || "";
    if (body.includes(property)) blocks.push({ selector, body });
  }
  return blocks;
}

void test("infinite wallpaper animation exists only for explicitly active animated effects", () => {
  const infiniteAnimations = declarationBlocks("animation:")
    .filter(({ body }) => /animation:[^;]*\binfinite\b/.test(body));

  assert.equal(infiniteAnimations.length, 3);
  for (const { selector } of infiniteAnimations) {
    assert.match(
      selector,
      /\[data-effect="(?:glitch|tv-noise)"\]/,
      `Unexpected infinite animation selector: ${selector}`,
    );
  }
});

void test("will-change is scoped to active animated effects instead of the idle wallpaper layer", () => {
  const promotedBlocks = declarationBlocks("will-change:");
  assert.equal(promotedBlocks.length, 2);
  for (const { selector } of promotedBlocks) {
    assert.match(
      selector,
      /\[data-effect="(?:glitch|tv-noise)"\]/,
      `Unexpected persistent compositing hint: ${selector}`,
    );
  }
  assert.doesNotMatch(
    styles.match(/\.vault-dashboard-wallpaper\s*\{([\s\S]*?)\n\}/)?.[1] || "",
    /will-change/,
  );
});

void test("animated effects have both runtime pause and reduced-motion shutdown paths", () => {
  assert.match(
    styles,
    /\[data-animation-paused="true"\][\s\S]*?animation-play-state:\s*paused/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\[data-reduce-motion="true"\][\s\S]*?animation:\s*none/,
  );
});
