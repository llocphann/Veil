import assert from "node:assert/strict";
import test from "node:test";
import { RuntimeWorkProfiler } from "../src/runtime-work-profiler";

void test("runtime work profiler counts named work units deterministically", () => {
  const profiler = new RuntimeWorkProfiler();
  profiler.record("documentApply");
  profiler.record("documentApply", 2);
  profiler.record("mediaAllocation");

  assert.deepEqual(profiler.snapshot(), {
    workspaceApply: 0,
    documentApply: 3,
    mediaAllocation: 1,
    appearanceApply: 0,
    libraryGridRender: 0,
    libraryCardPatch: 0,
  });
});

void test("runtime work profiler ignores invalid amounts and resets cleanly", () => {
  const profiler = new RuntimeWorkProfiler();
  profiler.record("libraryGridRender", 0);
  profiler.record("libraryGridRender", -2);
  profiler.record("libraryGridRender", Number.NaN);
  assert.equal(profiler.snapshot().libraryGridRender, 0);

  profiler.record("libraryCardPatch", 4);
  profiler.reset();
  assert.deepEqual(profiler.snapshot(), {
    workspaceApply: 0,
    documentApply: 0,
    mediaAllocation: 0,
    appearanceApply: 0,
    libraryGridRender: 0,
    libraryCardPatch: 0,
  });
});
