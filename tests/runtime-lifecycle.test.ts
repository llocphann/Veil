import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/main.ts", "utf8");

void test("plugin unload cancels scheduled work and removes document state", () => {
  const unload = source.match(/onunload\(\): void \{([\s\S]*?)\n {2}\}/)?.[1] || "";

  assert.match(unload, /cancelAnimationFrame\(this\.refreshFrame\)/);
  assert.match(unload, /clearTimeout\(this\.systemRoutingTimer\)/);
  assert.match(unload, /flushSettings\(\)/);
  assert.match(unload, /clearAllDocuments\(\)/);
  assert.match(unload, /activeRootLeaves\.clear\(\)/);
  assert.match(unload, /poolCandidates\.clear\(\)/);
  assert.match(unload, /poolSelections\.clear\(\)/);
  assert.match(unload, /previousPoolSelections\.clear\(\)/);
});

void test("document disposal releases timers, listeners, media resources, and DOM", () => {
  const dispose = source.match(/private disposeState\(state: DocumentState\): void \{([\s\S]*?)\n {2}\}/)?.[1] || "";

  assert.match(dispose, /clearTimeout\(state\.transitionTimer\)/);
  assert.match(dispose, /for \(const cleanup of state\.cleanups\) cleanup\(\)/);
  assert.match(dispose, /video\.pause\(\)/);
  assert.match(dispose, /video\.removeAttribute\("src"\)/);
  assert.match(dispose, /state\.media\.removeAttribute\("src"\)/);
  assert.match(dispose, /state\.layer\.remove\(\)/);
});

void test("closing a pop-out drops its leaf cache and wallpaper layer", () => {
  assert.match(
    source,
    /workspace\.on\("window-close",[\s\S]*?activeRootLeaves\.delete\(window\.document\);[\s\S]*?clearDocument\(window\.document\)/,
  );
});
