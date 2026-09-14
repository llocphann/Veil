import assert from "node:assert/strict";
import test from "node:test";
import { DocumentApplyScheduler } from "../src/document-apply-scheduler";

void test("targeted document applies coalesce within one animation frame", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let queued: FrameRequestCallback | null = null;
  let requestCalls = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        requestCalls += 1;
        queued = callback;
        return requestCalls;
      },
      cancelAnimationFrame: () => undefined,
    },
  });

  try {
    const documentA = { id: "a" } as unknown as Document;
    const documentB = { id: "b" } as unknown as Document;
    const applied: Document[] = [];
    let applyAllCalls = 0;
    const scheduler = new DocumentApplyScheduler(
      () => true,
      () => { applyAllCalls += 1; },
      (document) => applied.push(document),
    );

    scheduler.scheduleDocuments([documentA, documentA]);
    scheduler.scheduleDocuments([documentB]);
    assert.equal(requestCalls, 1);
    assert.ok(queued);
    const callback = queued as FrameRequestCallback;
    queued = null;
    callback(0);

    assert.equal(applyAllCalls, 0);
    assert.deepEqual(applied, [documentA, documentB]);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});

void test("broad refresh dominates targeted work in the same frame", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let queued: FrameRequestCallback | null = null;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        queued = callback;
        return 1;
      },
      cancelAnimationFrame: () => undefined,
    },
  });

  try {
    const documentA = {} as Document;
    const applied: Document[] = [];
    let applyAllCalls = 0;
    const scheduler = new DocumentApplyScheduler(
      () => true,
      () => { applyAllCalls += 1; },
      (document) => applied.push(document),
    );

    scheduler.scheduleDocuments([documentA]);
    scheduler.scheduleAll();
    scheduler.scheduleDocuments([documentA]);
    assert.ok(queued);
    const callback = queued as FrameRequestCallback;
    queued = null;
    callback(0);

    assert.equal(applyAllCalls, 1);
    assert.deepEqual(applied, []);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});
