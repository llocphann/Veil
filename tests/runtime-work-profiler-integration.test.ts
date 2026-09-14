import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("development work profiler is wired only at meaningful runtime boundaries", () => {
  const main = fs.readFileSync("src/main.ts", "utf8");
  const context = fs.readFileSync("src/document-context-resolver.ts", "utf8");
  const scenes = fs.readFileSync("src/scene-runtime.ts", "utf8");
  const sources = fs.readFileSync("src/wallpaper-source-resolver.ts", "utf8");
  const appearance = fs.readFileSync("src/wallpaper-document-appearance.ts", "utf8");
  const library = fs.readFileSync("src/wallpaper-library-modal.ts", "utf8");
  const build = fs.readFileSync("esbuild.config.mjs", "utf8");
  const verify = fs.readFileSync("verify-build.mjs", "utf8");

  assert.match(build, /__VEIL_DEV__:\s*JSON\.stringify\(!production\)/);
  assert.match(
    main,
    /if \(__VEIL_DEV__\) \{[\s\S]*?id: "debug-runtime-profile"[\s\S]*?runtimeWorkProfiler\.snapshot\(\)[\s\S]*?runtimeWorkProfiler\.reset\(\)/,
  );
  assert.match(main, /if \(__VEIL_DEV__\) runtimeWorkProfiler\.record\("workspaceApply"\)/);
  assert.match(main, /if \(__VEIL_DEV__\) runtimeWorkProfiler\.record\("documentApply"\)/);
  assert.match(main, /if \(__VEIL_DEV__\) runtimeWorkProfiler\.record\("mediaAllocation"\)/);

  const contextCacheReturn = context.indexOf("if (cached) return cached;");
  const contextRecord = context.indexOf('runtimeWorkProfiler.record("contextBuild")');
  assert.ok(contextCacheReturn >= 0 && contextRecord > contextCacheReturn);

  const sceneCacheReturn = scenes.indexOf("if (cached) return cached;");
  const sceneRecord = scenes.indexOf('runtimeWorkProfiler.record("sceneResolution")');
  assert.ok(sceneCacheReturn >= 0 && sceneRecord > sceneCacheReturn);

  const sourceCacheReturn = sources.indexOf("return cached;");
  const sourceRecord = sources.indexOf('runtimeWorkProfiler.record("sourceLookup")');
  assert.ok(sourceCacheReturn >= 0 && sourceRecord > sourceCacheReturn);

  const appearanceGuard = appearance.indexOf(
    "if (state.applicationSignature === applicationSignature) return;",
  );
  const appearanceRecord = appearance.indexOf(
    'runtimeWorkProfiler.record("appearanceApply")',
  );
  assert.ok(appearanceGuard >= 0);
  assert.ok(appearanceRecord > appearanceGuard, "appearance work must be counted after the no-op guard");

  assert.match(
    library,
    /if \(__VEIL_DEV__\) runtimeWorkProfiler\.record\("libraryGridRender"\)/,
  );
  assert.match(
    library,
    /runtimeWorkProfiler\.record\("libraryCardPatch", patchCount\)/,
  );
  assert.match(
    library,
    /runtimeWorkProfiler\.record\("libraryCardPatch"\);/,
  );

  assert.match(verify, /"debug-runtime-profile"/);
  assert.match(verify, /"\[veil\] runtime work profile"/);
});