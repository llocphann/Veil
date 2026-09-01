import assert from "node:assert/strict";
import test from "node:test";
import { nextSystemContextBoundary } from "../src/context-rules";
import type { WallpaperRule } from "../src/settings";

function scheduleRule(value: string): WallpaperRule {
  return {
    id: "schedule",
    enabled: true,
    matchType: "property",
    matchValue: value,
    profileId: "",
    wallpaperPath: "Media/scheduled.webp",
  };
}

void test("overnight schedule keeps the current-day end boundary from the previous start day", () => {
  const rule = scheduleRule("@schedule=mon 22:00-06:00");
  const earlyTuesday = new Date(2026, 8, 8, 2, 0);

  assert.equal(
    nextSystemContextBoundary([rule], earlyTuesday),
    new Date(2026, 8, 8, 6, 0).getTime(),
  );
});

void test("overnight weekday schedule ends at 06:00 before considering the next evening", () => {
  const rule = scheduleRule("@schedule=mon-fri 22:00-06:00");
  const earlyWednesday = new Date(2026, 8, 9, 5, 45);

  assert.equal(
    nextSystemContextBoundary([rule], earlyWednesday),
    new Date(2026, 8, 9, 6, 0).getTime(),
  );
});
