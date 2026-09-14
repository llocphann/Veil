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
