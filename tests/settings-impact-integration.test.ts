import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

void test("settings updates gate subsystem work by classified impact", () => {
  const body = source.match(
    /public updateSettings\([\s\S]*?\n {2}public flushSettings\(/,
  )?.[0] || "";

  assert.match(body, /const impact = classifySettingsChange\(previous, next\)/);
  assert.match(body, /rememberRecent && impact\.libraryRecent/);
  assert.match(body, /if \(impact\.sceneRuntime\) this\.scenes\.reconcileSettings\(next\)/);
  assert.match(body, /if \(impact\.poolRuntime\)/);
  assert.match(body, /if \(impact\.routingSchedule\) this\.systemRouting\.reschedule\(\)/);
  assert.match(body, /if \(impact\.documentResolution\) this\.refreshWallpaper\(\)/);
  assert.match(body, /this\.scheduleSave\(\)/);
});
