import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const lifecycleSource = readFileSync(
  new URL("../src/wallpaper-media-lifecycle.ts", import.meta.url),
  "utf8",
);

void test("same media returns before allocating a replacement layer or element", () => {
  const reuseIndex = mainSource.indexOf(
    "if (previous?.key === source.key && previous.layer.isConnected)",
  );
  const allocationIndex = mainSource.indexOf("const layer = document.body.createDiv()");
  assert.ok(reuseIndex >= 0 && allocationIndex > reuseIndex);

  const reuseBranch = mainSource.slice(reuseIndex, allocationIndex);
  assert.doesNotMatch(reuseBranch, /createEl\(/);
  assert.doesNotMatch(reuseBranch, /media\.src/);
  assert.doesNotMatch(reuseBranch, /\.load\(\)/);
  assert.doesNotMatch(reuseBranch, /startCrossfade/);
});

void test("image and GIF sources share img allocation while video owns video allocation", () => {
  assert.match(
    mainSource,
    /source\.kind === "video" \? layer\.createEl\("video"\) : layer\.createEl\("img"\)/,
  );
});

void test("load and error callbacks reject stale document states", () => {
  assert.match(
    mainSource,
    /const isCurrent = \(\): boolean =>[\s\S]*?!activeState\.disposed[\s\S]*?this\.documents\.get\(document\) === activeState/,
  );
  assert.match(mainSource, /const ready = \(\): void => \{[\s\S]*?if \(!isCurrent\(\)/);
  assert.match(mainSource, /listen\(media, "error", \(\) => \{[\s\S]*?if \(!isCurrent\(\)\) return;/);
});

void test("media disposal releases listeners, source resources, and the layer", () => {
  assert.match(lifecycleSource, /for \(const cleanup of state\.cleanups\) cleanup\(\)/);
  assert.match(lifecycleSource, /video\.removeAttribute\("src"\)/);
  assert.match(lifecycleSource, /state\.media\.removeAttribute\("src"\)/);
  assert.match(lifecycleSource, /state\.layer\.remove\(\)/);
});
