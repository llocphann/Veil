import assert from "node:assert/strict";
import test from "node:test";
import type { NoteContext } from "../src/context-rules";
import { SceneRuntime } from "../src/scene-runtime";
import { normalizeSettings } from "../src/settings";

const context: NoteContext = {
  path: "Projects/Alpha.md",
  name: "Alpha.md",
  basename: "Alpha",
  tags: ["#focus"],
  properties: {},
};

function settings() {
  return normalizeSettings({
    wallpaperPath: "Media/default.webp",
    profiles: [
      { id: "focus", name: "Focus", wallpaperPath: "Media/focus.webp", opacity: 70 },
      { id: "calm", name: "Calm", wallpaperPath: "Media/calm.webp", opacity: 45 },
    ],
    wallpaperRules: [{
      id: "focus-route",
      enabled: true,
      matchType: "tag",
      matchValue: "focus",
      profileId: "focus",
      wallpaperPath: "",
    }],
  });
}

void test("manual scene overrides automatic context routing", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  assert.equal(runtime.resolve(current, context).profile?.id, "focus");

  const change = runtime.setManualProfile("calm", current);
  assert.equal(change.kind, "selected");
  const resolved = runtime.resolve(current, context);
  assert.equal(resolved.rule, null);
  assert.equal(resolved.profile?.id, "calm");
  assert.equal(resolved.path, "Media/calm.webp");
  assert.equal(resolved.appearance.opacity, 45);
});

void test("selecting the active manual scene is a no-op", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  assert.equal(runtime.setManualProfile("focus", current).kind, "selected");
  assert.equal(runtime.setManualProfile("focus", current).kind, "unchanged");
  assert.equal(runtime.getManualProfileId(), "focus");
});

void test("missing scene selection is rejected without replacing the current override", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  runtime.setManualProfile("focus", current);
  assert.equal(runtime.setManualProfile("missing", current).kind, "missing");
  assert.equal(runtime.getManualProfileId(), "focus");
});

void test("removing the active manual scene restores automatic routing", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  runtime.setManualProfile("calm", current);

  const next = normalizeSettings({
    ...current,
    profiles: current.profiles.filter((profile) => profile.id !== "calm"),
  });
  runtime.reconcileSettings(next);

  assert.equal(runtime.getManualProfileId(), "");
  assert.equal(runtime.resolve(next, context).profile?.id, "focus");
});

void test("clearing a manual scene resumes automatic routing", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  runtime.setManualProfile("calm", current);
  assert.equal(runtime.setManualProfile("", current).kind, "cleared");
  assert.equal(runtime.resolve(current, context).profile?.id, "focus");
});

void test("unchanged static settings and context reuse one scene resolution", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  const first = runtime.resolve(current, context);
  const second = runtime.resolve(current, context);
  assert.equal(second, first);
  assert.equal(runtime.resolveSnapshot(current, context), first);
});

void test("settings identity, context identity, and explicit revision invalidate scene resolution", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  const first = runtime.resolve(current, context);

  const equivalentContext: NoteContext = { ...context, tags: [...context.tags] };
  const contextResolution = runtime.resolve(current, equivalentContext);
  assert.notEqual(contextResolution, first);

  const equivalentSettings = normalizeSettings(current);
  const settingsResolution = runtime.resolve(equivalentSettings, context);
  assert.notEqual(settingsResolution, first);

  runtime.invalidateResolution();
  const revised = runtime.resolve(current, context);
  assert.notEqual(revised, first);
  assert.equal(revised.profile?.id, "focus");
});

void test("manual scene revision invalidates cached automatic resolution", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  const automatic = runtime.resolve(current, context);
  assert.equal(automatic.profile?.id, "focus");

  runtime.setManualProfile("calm", current);
  const manual = runtime.resolve(current, context);
  assert.notEqual(manual, automatic);
  assert.equal(manual.profile?.id, "calm");

  runtime.setManualProfile("", current);
  const restored = runtime.resolve(current, context);
  assert.notEqual(restored, manual);
  assert.equal(restored.profile?.id, "focus");
});

void test("snapshot comparisons never populate cache on a miss", () => {
  const runtime = new SceneRuntime();
  const current = settings();
  const first = runtime.resolveSnapshot(current, context);
  const second = runtime.resolveSnapshot(current, context);
  assert.notEqual(second, first);
  assert.equal(first.profile?.id, "focus");
  assert.equal(second.profile?.id, "focus");
});

void test("time-dependent system routing never reuses a stale resolution", () => {
  const runtime = new SceneRuntime();
  const current = normalizeSettings({
    ...settings(),
    wallpaperRules: [{
      id: "work-hours",
      enabled: true,
      matchType: "property",
      matchValue: "@time=09:00-17:00",
      profileId: "focus",
      wallpaperPath: "",
    }],
  });
  const morning: NoteContext = { ...context, now: new Date(2026, 8, 14, 10, 0) };
  const evening: NoteContext = { ...context, now: new Date(2026, 8, 14, 20, 0) };

  const first = runtime.resolve(current, morning);
  const second = runtime.resolve(current, morning);
  assert.notEqual(second, first);
  assert.equal(first.profile?.id, "focus");
  assert.equal(runtime.resolve(current, evening).profile, null);
});
