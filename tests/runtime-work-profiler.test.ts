import assert from "node:assert/strict";
import test from "node:test";
import { RuntimeWorkProfiler } from "../src/runtime-work-profiler";

const emptySnapshot = {
  workspaceApply: 0,
  documentApply: 0,
  mediaAllocation: 0,
  appearanceApply: 0,
  libraryGridRender: 0,
  libraryCardPatch: 0,
  contextBuild: 0,
  sceneResolution: 0,
  sourceLookup: 0,
};

void test("runtime work profiler counts named work units deterministically", () => {
  const profiler = new RuntimeWorkProfiler();
  profiler.record("documentApply");
  profiler.record("documentApply", 2);
  profiler.record("mediaAllocation");
  profiler.record("contextBuild", 2);
  profiler.record("sceneResolution", 3);
  profiler.record("sourceLookup", 4);

  assert.deepEqual(profiler.snapshot(), {
    ...emptySnapshot,
    documentApply: 3,
    mediaAllocation: 1,
    contextBuild: 2,
    sceneResolution: 3,
    sourceLookup: 4,
  });
});

void test("runtime work profiler ignores invalid amounts and resets cleanly", () => {
  const profiler = new RuntimeWorkProfiler();
  profiler.record("libraryGridRender", 0);
  profiler.record("libraryGridRender", -2);
  profiler.record("libraryGridRender", Number.NaN);
  assert.equal(profiler.snapshot().libraryGridRender, 0);

  profiler.record("libraryCardPatch", 4);
  profiler.record("sourceLookup", 2);
  profiler.reset();
  assert.deepEqual(profiler.snapshot(), emptySnapshot);
});