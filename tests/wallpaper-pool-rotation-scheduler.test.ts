import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { WallpaperPoolRotationScheduler } from "../src/wallpaper-pool-rotation-scheduler";

void test("unchanged pool boundary keeps one exact timer and inactive state clears it", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNow = Date.now;
  let setCalls = 0;
  let clearCalls = 0;
  let nextTimerId = 0;
  let callback: (() => void) | null = null;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout: (next: () => void) => {
        setCalls += 1;
        callback = next;
        nextTimerId += 1;
        return nextTimerId;
      },
      clearTimeout: () => {
        clearCalls += 1;
      },
    },
  });
  Date.now = () => 1_000;

  try {
    let active = true;
    let boundary: number | null = 61_000;
    let rotations = 0;
    const scheduler = new WallpaperPoolRotationScheduler(
      () => boundary,
      () => active,
      () => {
        rotations += 1;
        boundary = null;
      },
    );

    scheduler.reschedule();
    scheduler.reschedule();
    assert.equal(setCalls, 1);
    assert.equal(clearCalls, 0);

    const scheduledCallback = callback as (() => void) | null;
    assert.ok(scheduledCallback);
    scheduledCallback();
    assert.equal(rotations, 1);
    assert.equal(clearCalls, 0);

    boundary = 121_000;
    scheduler.reschedule();
    assert.equal(setCalls, 2);
    active = false;
    scheduler.reschedule();
    assert.equal(clearCalls, 1);
  } finally {
    Date.now = originalNow;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});

void test("pool rotation is one-shot and never uses recurring polling", () => {
  const source = fs.readFileSync("src/wallpaper-pool-rotation-scheduler.ts", "utf8");
  assert.match(source, /window\.setTimeout/);
  assert.doesNotMatch(source, /setInterval|requestAnimationFrame/);
});

void test("main rotates only documents using due pool contexts", () => {
  const source = fs.readFileSync("src/main.ts", "utf8");
  assert.match(source, /new WallpaperPoolRotationScheduler/);
  assert.match(
    source,
    /for \(const contextKey of this\.wallpaperPools\.consumeDueRotations\(\)\)[\s\S]*?documentsUsingPoolContext\(contextKey\)[\s\S]*?scheduleApplyToDocuments/,
  );
  assert.match(source, /this\.poolRotation\.clear\(\);/);
  assert.match(source, /this\.poolRotation\.reschedule\(\);/);
});
