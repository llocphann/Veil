import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mainSource = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const contextSource = readFileSync(
  new URL("../src/document-context-resolver.ts", import.meta.url),
  "utf8",
);
const sceneSource = readFileSync(
  new URL("../src/scene-runtime.ts", import.meta.url),
  "utf8",
);
const poolSource = readFileSync(
  new URL("../src/wallpaper-pool-runtime.ts", import.meta.url),
  "utf8",
);
const sourceResolverSource = readFileSync(
  new URL("../src/wallpaper-source-resolver.ts", import.meta.url),
  "utf8",
);
const librarySource = readFileSync(
  new URL("../src/wallpaper-library-runtime.ts", import.meta.url),
  "utf8",
);
const persistenceSource = readFileSync(
  new URL("../src/settings-persistence.ts", import.meta.url),
  "utf8",
);
const routingSource = readFileSync(
  new URL("../src/system-routing-scheduler.ts", import.meta.url),
  "utf8",
);
const vaultRenameSource = readFileSync(
  new URL("../src/vault-settings-rename.ts", import.meta.url),
  "utf8",
);

void test("main delegates document context ownership", () => {
  assert.match(mainSource, /new DocumentContextResolver\(this\.app\)/);
  assert.doesNotMatch(mainSource, /activeRootLeaves/);
  assert.match(contextSource, /private readonly activeRootLeaves/);
  assert.match(contextSource, /contextForDocument\(document: Document\)/);
  assert.match(contextSource, /isActiveFile\(file: TFile\)/);
});

void test("main delegates scene override ownership", () => {
  assert.match(mainSource, /new SceneRuntime\(\)/);
  assert.doesNotMatch(mainSource, /private manualProfileId/);
  assert.doesNotMatch(mainSource, /resolveWallpaper/);
  assert.doesNotMatch(mainSource, /copyAppearance/);
  assert.match(sceneSource, /private manualProfileId = ""/);
  assert.match(sceneSource, /setManualProfile\(/);
  assert.match(sceneSource, /resolve\(settings: VeilSettings, context: NoteContext \| null\)/);
  assert.match(sceneSource, /summary\(settings: VeilSettings, context: NoteContext \| null\)/);
});

void test("main delegates wallpaper pool runtime ownership", () => {
  assert.match(mainSource, /new WallpaperPoolRuntime\(this\.app\)/);
  assert.doesNotMatch(mainSource, /poolCandidates/);
  assert.doesNotMatch(mainSource, /poolSelections/);
  assert.doesNotMatch(mainSource, /previousPoolSelections/);
  assert.match(poolSource, /private readonly candidates/);
  assert.match(poolSource, /private readonly selections/);
  assert.match(poolSource, /private readonly previousSelections/);
  assert.match(poolSource, /reconcileSettings\(/);
  assert.match(poolSource, /pathForAppearance\(/);
});

void test("main delegates wallpaper source resolution", () => {
  assert.match(mainSource, /new WallpaperSourceResolver\(/);
  assert.doesNotMatch(mainSource, /private sourceForDocument/);
  assert.doesNotMatch(mainSource, /getAbstractFileByPath/);
  assert.doesNotMatch(mainSource, /mediaKind\(/);
  assert.match(sourceResolverSource, /getAbstractFileByPath\(path\)/);
  assert.match(sourceResolverSource, /mediaKind\(file\)/);
  assert.match(sourceResolverSource, /pathForAppearance\(resolved\.appearance, contextKey\)/);
  assert.match(sourceResolverSource, /sourceRevision/);
});

void test("main delegates wallpaper library state ownership", () => {
  assert.match(mainSource, /new WallpaperLibraryRuntime\(\)/);
  assert.doesNotMatch(mainSource, /normalizeWallpaperLibraryState/);
  assert.doesNotMatch(mainSource, /rememberRecentWallpaper/);
  assert.doesNotMatch(mainSource, /toggleFavoriteWallpaper/);
  assert.doesNotMatch(mainSource, /pruneWallpaperLibrary/);
  assert.match(librarySource, /private state: WallpaperLibraryState/);
  assert.match(librarySource, /rememberSettingsChanges\(/);
  assert.match(librarySource, /rewritePaths\(/);
  assert.match(librarySource, /prune\(path: string\)/);
});

void test("main delegates settings persistence ownership", () => {
  assert.match(mainSource, /new SettingsPersistence\(/);
  assert.doesNotMatch(mainSource, /saveTimer/);
  assert.doesNotMatch(mainSource, /pendingSave/);
  assert.doesNotMatch(mainSource, /saveQueue/);
  assert.match(persistenceSource, /private saveTimer/);
  assert.match(persistenceSource, /private pendingSave/);
  assert.match(persistenceSource, /private saveQueue/);
  assert.match(mainSource, /return this\.settingsPersistence\.flush\(\)/);
  assert.match(mainSource, /this\.settingsPersistence\.schedule\(\)/);
});

void test("main delegates system routing timer ownership", () => {
  assert.match(mainSource, /new SystemRoutingScheduler\(/);
  assert.doesNotMatch(mainSource, /systemRoutingTimer/);
  assert.doesNotMatch(mainSource, /nextSystemContextBoundary/);
  assert.match(routingSource, /private timer: number \| null/);
  assert.match(routingSource, /nextSystemContextBoundary\(/);
  assert.match(mainSource, /this\.systemRouting\.reschedule\(\)/);
  assert.match(mainSource, /this\.systemRouting\.clear\(\)/);
});

void test("main delegates vault rename settings rewrites", () => {
  assert.match(mainSource, /rewriteSettingsForVaultRename\(this\.settings, oldPath, file\.path\)/);
  assert.doesNotMatch(mainSource, /const wallpaperPath = .*oldPath/);
  assert.match(vaultRenameSource, /for \(const profile of next\.profiles\)/);
  assert.match(vaultRenameSource, /for \(const rule of next\.wallpaperRules\)/);
  assert.match(vaultRenameSource, /for \(const rule of next\.opacityExclusions\)/);
});
