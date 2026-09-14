import assert from "node:assert/strict";
import test from "node:test";
import { SettingsControlFrameQueue } from "../src/settings-control-frame-queue";

function harness(): {
  queue: SettingsControlFrameQueue;
  frames: Array<() => void>;
  applied: Array<Map<string, unknown>>;
  cancelled: boolean[];
} {
  const frames: Array<() => void> = [];
  const applied: Array<Map<string, unknown>> = [];
  const cancelled: boolean[] = [];
  const queue = new SettingsControlFrameQueue(
    (callback) => {
      const index = frames.length;
      frames.push(callback);
      cancelled[index] = false;
      return () => {
        cancelled[index] = true;
      };
    },
    (values) => applied.push(new Map(values)),
  );
  return { queue, frames, applied, cancelled };
}

void test("rapid control changes coalesce into one frame with latest values", () => {
  const { queue, frames, applied } = harness();

  queue.queue("opacity", 10);
  queue.queue("opacity", 20);
  queue.queue("wallpaperZoom", 115);

  assert.equal(frames.length, 1);
  assert.equal(applied.length, 0);
  assert.equal(queue.value("opacity", 0), 20);
  assert.equal(queue.value("wallpaperZoom", 100), 115);

  frames[0]?.();

  assert.equal(applied.length, 1);
  assert.deepEqual(Array.from(applied[0]?.entries() || []), [
    ["opacity", 20],
    ["wallpaperZoom", 115],
  ]);
});

void test("explicit flush cancels the frame and preserves the final value", () => {
  const { queue, frames, applied, cancelled } = harness();

  queue.queue("opacity", 30);
  queue.queue("opacity", 40);
  queue.flush();

  assert.equal(cancelled[0], true);
  assert.equal(applied.length, 1);
  assert.equal(applied[0]?.get("opacity"), 40);

  if (!cancelled[0]) frames[0]?.();
  assert.equal(applied.length, 1);
});

void test("clear drops pending values without applying them", () => {
  const { queue, applied, cancelled } = harness();

  queue.queue("opacity", 55);
  queue.clear();

  assert.equal(cancelled[0], true);
  assert.equal(applied.length, 0);
  assert.equal(queue.value("opacity", 15), 15);
});

void test("synchronous frame implementations remain safe", () => {
  const applied: Array<Map<string, unknown>> = [];
  const queue = new SettingsControlFrameQueue(
    (callback) => {
      callback();
      return () => undefined;
    },
    (values) => applied.push(new Map(values)),
  );

  queue.queue("opacity", 25);
  queue.queue("opacity", 35);

  assert.equal(applied.length, 2);
  assert.equal(applied[0]?.get("opacity"), 25);
  assert.equal(applied[1]?.get("opacity"), 35);
});
