import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");

void test("settings updates gate subsystem work by classified impact", () => {
  const body = source.match(
    /public updateSettings\([\s\S]*?\n {2}public flushSettings\(/,
  )?.[0] || "";

  assert.match(body, /const impact = classifySettingsChange\(previous, next\)/);
  assert.match(body, /documentsAffectedBySettings\(previous, next\)/);
  assert.match(body, /rememberRecent && impact\.libraryRecent/);
  assert.match(body, /if \(impact\.sceneRuntime\) this\.scenes\.reconcileSettings\(next\)/);
  assert.match(body, /if \(impact\.poolRuntime\)/);
  assert.match(body, /if \(impact\.routingSchedule\) this\.systemRouting\.reschedule\(\)/);
  assert.match(body, /if \(impact\.enabled\) this\.refreshWallpaper\(\)/);
  assert.match(body, /scheduleApplyToDocuments\(affectedDocuments\)/);
  assert.match(body, /this\.scheduleSave\(\)/);
});

void test("document settings impact compares side-effect-free scene snapshots", () => {
  const body = source.match(
    /private documentsAffectedBySettings\([\s\S]*?\n {2}private setStatus\(/,
  )?.[0] || "";

  assert.match(body, /const context: NoteContext = \{ \.\.\.currentContext, now: new Date\(\) \}/);
  assert.match(body, /this\.scenes\.resolveSnapshot\(previous, context\)/);
  assert.match(body, /this\.scenes\.resolveSnapshot\(next, context\)/);
  assert.match(body, /resolvedDocumentSettingsChanged\(/);
});
