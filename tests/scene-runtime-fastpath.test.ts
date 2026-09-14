import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/scene-runtime.ts", import.meta.url), "utf8");

void test("valid manual scenes resolve before automatic routing", () => {
  const body = source.match(
    /private resolveUncached\([\s\S]*?\n {2}private cacheAllowed\(/,
  )?.[0] || "";
  const manualLookup = body.indexOf("settings.profiles.find");
  const automaticResolution = body.indexOf("return resolveWallpaper(settings, context)");

  assert.ok(manualLookup >= 0);
  assert.ok(automaticResolution > manualLookup);
  assert.match(body, /if \(profile\) \{[\s\S]*?rule: null,[\s\S]*?profile,[\s\S]*?copyAppearance\(profile\)/);
});

void test("missing manual scenes still fall back to automatic routing", () => {
  const body = source.match(
    /private resolveUncached\([\s\S]*?\n {2}private cacheAllowed\(/,
  )?.[0] || "";
  assert.match(body, /return resolveWallpaper\(settings, context\)/);
});

void test("snapshot resolution can reuse cache without populating it on a miss", () => {
  const body = source.match(
    /resolveSnapshot\([\s\S]*?\n {2}resolve\(/,
  )?.[0] || "";
  assert.match(body, /const cached = this\.cachedResolution\(settings, context\)/);
  assert.match(body, /if \(cached\) return cached/);
  assert.match(body, /return this\.resolveUncached\(settings, context\)/);
  assert.doesNotMatch(body, /storeResolution/);
});
