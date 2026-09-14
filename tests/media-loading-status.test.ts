import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

void test("same-media reuse keeps loading status until the media is ready", () => {
  const branch = source.match(
    /if \(previous\?\.key === source\.key && previous\.layer\.isConnected\) \{([\s\S]*?)\n {4}\}/,
  )?.[1] || "";

  assert.match(branch, /previous\.sourceLabel = source\.label/);
  assert.match(branch, /previous\.contextLabel = source\.contextLabel/);
  assert.match(branch, /previous\.ready/);
  assert.match(branch, /loading \$\{source\.label\.toLowerCase\(\)\}/);
  assert.match(branch, /previous\.ready \? "success" : "info"/);
});

void test("ready status reads current state labels instead of the creation closure", () => {
  const ready = source.match(
    /const ready = \(\): void => \{([\s\S]*?)\n {4}\};/,
  )?.[1] || "";

  assert.match(ready, /activeState\.contextLabel/);
  assert.match(ready, /activeState\.sourceLabel/);
  assert.match(ready, /activeState\.path/);
});
