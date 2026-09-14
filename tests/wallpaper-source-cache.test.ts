import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/wallpaper-source-resolver.ts", import.meta.url),
  "utf8",
);
const poolSource = readFileSync(
  new URL("../src/wallpaper-pool-runtime.ts", import.meta.url),
  "utf8",
);

void test("unchanged wallpaper source lookup returns before vault path resolution", () => {
  const body = source.match(
    /private mediaLookup\([\s\S]*?\n {2}private cachedLookupStillCurrent\(/,
  )?.[0] || "";
  const cacheRead = body.indexOf("this.mediaLookupCache.get(path)");
  const cacheReturn = body.indexOf("return cached;");
  const vaultLookup = body.indexOf("this.app.vault.getAbstractFileByPath(path)");
  const resourceLookup = body.indexOf("this.app.vault.getResourcePath(file)");
  const mediaIdentity = body.indexOf("wallpaperMediaIdentityKey({");

  assert.ok(cacheRead >= 0);
  assert.ok(cacheReturn > cacheRead);
  assert.ok(vaultLookup > cacheReturn);
  assert.ok(resourceLookup > vaultLookup);
  assert.ok(mediaIdentity > resourceLookup);
});

void test("cached source validates file identity and stat without another vault lookup", () => {
  const body = source.match(
    /private cachedLookupStillCurrent\([\s\S]*?\n {2}private rememberLookup\(/,
  )?.[0] || "";
  assert.match(body, /cached\.file\.path === cached\.path/);
  assert.match(body, /cached\.file\.stat\.mtime === cached\.modifiedAt/);
  assert.match(body, /cached\.file\.stat\.size === cached\.size/);
  assert.doesNotMatch(body, /getAbstractFileByPath/);
});

void test("source revision and path are part of cache reuse boundaries", () => {
  const body = source.match(
    /private mediaLookup\([\s\S]*?\n {2}private cachedLookupStillCurrent\(/,
  )?.[0] || "";
  assert.match(body, /cached\.revision === sourceRevision/);
  assert.match(body, /private readonly mediaLookupCache = new Map<string, CachedMediaLookup>/);
  assert.match(source, /path: file\.path,[\s\S]*?revision: sourceRevision/);
});

void test("pool vault events invalidate exact and renamed source paths", () => {
  assert.match(source, /this\.pools\.onVaultEvent\(/);
  const body = source.match(
    /private invalidateVaultEvent\([\s\S]*?\n {2}private pathWithin\(/,
  )?.[0] || "";
  assert.match(body, /this\.mediaLookupCache\.delete\(path\)/);
  assert.match(body, /if \(oldPath\) this\.mediaLookupCache\.delete\(oldPath\)/);
  assert.match(body, /this\.pathWithin\(cachedPath, path\)/);
  assert.match(body, /this\.pathWithin\(cachedPath, oldPath\)/);
});

void test("pool runtime publishes vault invalidation before candidate cache handling", () => {
  const body = poolSource.match(
    /invalidateVaultEvent\([\s\S]*?\n {2}rewriteSelectionsForRename\(/,
  )?.[0] || "";
  const listeners = body.indexOf("for (const listener of this.vaultEventListeners)");
  const candidateInvalidation = body.indexOf("invalidatePoolCandidatesForVaultEvent(");
  assert.ok(listeners >= 0);
  assert.ok(candidateInvalidation > listeners);
  assert.match(poolSource, /this\.vaultEventListeners\.clear\(\)/);
});

void test("source lookup cache remains bounded", () => {
  assert.match(source, /const MAX_SOURCE_LOOKUPS = 128/);
  const body = source.match(
    /private rememberLookup\([\s\S]*?\n {2}private invalidateVaultEvent\(/,
  )?.[0] || "";
  assert.match(body, /this\.mediaLookupCache\.size >= MAX_SOURCE_LOOKUPS/);
  assert.match(body, /this\.mediaLookupCache\.delete\(oldest\)/);
});
