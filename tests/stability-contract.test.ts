import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  VEIL_PERSISTED_DATA_SCHEMA_KEY,
  VEIL_PERSISTED_DATA_SCHEMA_VERSION,
  migratePersistedVeilData,
} from "../src/persisted-data-schema";
import { shouldInvalidatePoolCandidates } from "../src/pool-cache-invalidation";
import { wallpaperPlaybackState } from "../src/wallpaper-playback-state";

const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const appearance = readFileSync(
  new URL("../src/wallpaper-document-appearance.ts", import.meta.url),
  "utf8",
);
const scheduler = readFileSync(
  new URL("../src/system-routing-scheduler.ts", import.meta.url),
  "utf8",
);
const mediaLifecycle = readFileSync(
  new URL("../src/wallpaper-media-lifecycle.ts", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

void test("2.0 invariant 1: no-op document appearance returns before meaningful work", () => {
  const guard = appearance.indexOf(
    "if (state.applicationSignature === applicationSignature) return;",
  );
  const work = appearance.indexOf('runtimeWorkProfiler.record("appearanceApply")');
  assert.ok(guard >= 0);
  assert.ok(work > guard, "appearance work must remain behind the stable-signature guard");
});

void test("2.0 invariant 2: unchanged media returns before replacement allocation", () => {
  const body = main.match(
    /private applyToDocument\(document: Document\): void \{([\s\S]*?)\n {2}private startCrossfade/,
  )?.[1] || "";
  const sameMedia = body.indexOf("previous?.key === source.key");
  const allocation = body.indexOf('runtimeWorkProfiler.record("mediaAllocation")');
  assert.ok(sameMedia >= 0);
  assert.ok(allocation > sameMedia);
  const reuseBranch = body.slice(sameMedia, allocation);
  assert.match(reuseBranch, /this\.applyOptions\(document, previous, context, source\.appearance\)/);
  assert.match(reuseBranch, /return;/);
  assert.doesNotMatch(reuseBranch, /media\.src\s*=/);
  assert.doesNotMatch(reuseBranch, /\.load\(\)/);
});

void test("2.0 invariant 3: note context events stay document-scoped", () => {
  const activeLeaf = main.match(
    /this\.registerEvent\(this\.app\.workspace\.on\("active-leaf-change"[\s\S]*?\n {4}\}\)\);/,
  )?.[0] || "";
  assert.match(activeLeaf, /scheduleApplyToDocuments\(\[document\]\)/);
  assert.doesNotMatch(activeLeaf, /refreshWallpaper\(\)/);

  const metadata = main.match(
    /this\.app\.metadataCache\.on\("changed"[\s\S]*?\n {6}\}\),/,
  )?.[0] || "";
  assert.match(metadata, /documentsForFile\(file\)/);
  assert.match(metadata, /scheduleApplyToDocuments/);
});

void test("2.0 invariant 4: vault cache invalidation ignores unrelated file churn", () => {
  assert.equal(shouldInvalidatePoolCandidates("create", "Notes/readme.md"), false);
  assert.equal(shouldInvalidatePoolCandidates("delete", "Notes/readme.md"), false);
  assert.equal(shouldInvalidatePoolCandidates("create", "Wallpapers/sky.webp"), true);
  assert.equal(
    shouldInvalidatePoolCandidates(
      "rename",
      "Notes/renamed.md",
      "Wallpapers/old.png",
    ),
    true,
  );
  assert.match(main, /refreshDocumentsAffectedByVaultPath\(file\.path\)/);
  assert.doesNotMatch(
    main.match(/private registerVaultEvents\(\): void \{([\s\S]*?)\n {2}\}/)?.[1] || "",
    /refreshWallpaper\(true\)/,
  );
});

void test("2.0 invariant 5: idle operation has no recurring polling or hidden visual motion", () => {
  assert.doesNotMatch(main, /setInterval\s*\(/);
  assert.doesNotMatch(scheduler, /setInterval\s*\(/);
  assert.doesNotMatch(mediaLifecycle, /setInterval\s*\(/);
  assert.match(
    scheduler,
    /if \(boundary === null\) \{\s*this\.clear\(\);\s*return;/,
  );
  assert.match(
    scheduler,
    /if \(this\.timer !== null && this\.scheduledBoundary === boundary\) return;/,
  );

  const hidden = wallpaperPlaybackState({
    enabled: true,
    opacity: 100,
    pauseWhenHidden: false,
    documentHidden: true,
    respectReducedMotion: false,
    reducedMotion: false,
  });
  assert.equal(hidden.motionPaused, true);
  assert.equal(hidden.shouldPlayVideo, true);
  assert.doesNotMatch(
    styles.match(/\.vault-dashboard-wallpaper\s*\{([\s\S]*?)\n\}/)?.[1] || "",
    /animation\s*:/,
  );
});

void test("2.0 invariant 6: persisted data always has a deterministic migration path", () => {
  const legacy = migratePersistedVeilData({ enabled: true });
  assert.equal(legacy.sourceVersion, 0);
  assert.equal(legacy.targetVersion, VEIL_PERSISTED_DATA_SCHEMA_VERSION);
  assert.equal(
    legacy.data[VEIL_PERSISTED_DATA_SCHEMA_KEY],
    VEIL_PERSISTED_DATA_SCHEMA_VERSION,
  );

  const current = migratePersistedVeilData(legacy.data);
  assert.equal(current.migrated, false);
  assert.deepEqual(current.data, legacy.data);
});
