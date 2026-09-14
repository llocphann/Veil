import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, type VeilSettings } from "../src/settings";
import { SystemRoutingScheduler } from "../src/system-routing-scheduler";

function routedSettings(): VeilSettings {
  return {
    ...DEFAULT_SETTINGS,
    wallpaperRules: [{
      id: "system-day",
      enabled: true,
      matchType: "property",
      matchValue: "@day=monday",
      profileId: "",
      wallpaperPath: "",
    }],
    opacityExclusions: [],
    profiles: [],
  };
}

void test("unchanged system boundary keeps the existing timer", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let setCalls = 0;
  let clearCalls = 0;
  let nextTimerId = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setTimeout: () => {
        setCalls += 1;
        nextTimerId += 1;
        return nextTimerId;
      },
      clearTimeout: () => {
        clearCalls += 1;
      },
    },
  });

  try {
    let settings = routedSettings();
    const scheduler = new SystemRoutingScheduler(
      () => settings,
      () => true,
      () => undefined,
    );

    scheduler.reschedule();
    scheduler.reschedule();
    assert.equal(setCalls, 1);
    assert.equal(clearCalls, 0);

    settings = { ...settings, enabled: false };
    scheduler.reschedule();
    assert.equal(setCalls, 1);
    assert.equal(clearCalls, 1);

    settings = { ...settings, enabled: true };
    scheduler.reschedule();
    assert.equal(setCalls, 2);
    assert.equal(clearCalls, 1);

    scheduler.clear();
    assert.equal(clearCalls, 2);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});
