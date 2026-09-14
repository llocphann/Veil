import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const resolverSource = readFileSync(
  new URL("../src/wallpaper-source-resolver.ts", import.meta.url),
  "utf8",
);

void test("wallpaper source keys are media-only identities", () => {
  assert.match(resolverSource, /wallpaperMediaIdentityKey\(\{/);
  const keyBody = resolverSource.match(
    /wallpaperMediaIdentityKey\(\{([\s\S]*?)\}\)/,
  )?.[1] || "";
  assert.match(keyBody, /path: file\.path/);
  assert.match(keyBody, /url/);
  assert.match(keyBody, /modifiedAt: file\.stat\.mtime/);
  assert.match(keyBody, /size: file\.stat\.size/);
  assert.match(keyBody, /revision: sourceRevision/);
  assert.doesNotMatch(keyBody, /contextKey/);
  assert.doesNotMatch(keyBody, /manualProfileId/);
  assert.doesNotMatch(keyBody, /appearance/);
});

void test("scene switches do not force a media revision", () => {
  const body = mainSource.match(
    /private setManualScene\(profileId: string\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(body, /scheduleApplyToWorkspace\(\)/);
  assert.doesNotMatch(body, /sourceRevision/);
});

void test("explicit reload remains the media force-reload boundary", () => {
  const body = mainSource.match(
    /public refreshWallpaper\(force = false\): void \{([\s\S]*?)\n {2}\}/,
  )?.[1] || "";
  assert.match(body, /if \(force\) this\.sourceRevision \+= 1/);
});
