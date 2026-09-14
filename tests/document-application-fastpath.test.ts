import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { NoteContext } from "../src/context-rules";
import {
  DEFAULT_SETTINGS,
  createProfile,
  type OpacityExclusionRule,
  type VeilAppearance,
  type VeilSettings,
} from "../src/settings";
import { wallpaperDocumentApplicationSignature } from "../src/wallpaper-document-signature";

const appearanceSource = fs.readFileSync("src/wallpaper-document-appearance.ts", "utf8");
const lifecycleSource = fs.readFileSync("src/wallpaper-media-lifecycle.ts", "utf8");

function appearance(overrides: Partial<VeilAppearance> = {}): VeilAppearance {
  const source: VeilSettings = { ...DEFAULT_SETTINGS, ...overrides };
  const { id: _id, name: _name, ...result } = createProfile([], source);
  return result;
}

const context: NoteContext = {
  path: "Notes/A.md",
  name: "A.md",
  basename: "A",
  tags: [],
  properties: {},
};

function exclusion(overrides: Partial<OpacityExclusionRule> = {}): OpacityExclusionRule {
  return {
    id: "opacity-test",
    enabled: true,
    matchType: "path",
    matchValue: context.path,
    excludePaneSurface: true,
    excludePaneContent: false,
    ...overrides,
  };
}

function signature(options: {
  appearance?: VeilAppearance;
  opacityExclusions?: OpacityExclusionRule[];
  profileId?: string | null;
  updateProfileId?: boolean;
  ready?: boolean;
} = {}): string {
  return wallpaperDocumentApplicationSignature({
    appearance: options.appearance || appearance(),
    context,
    opacityExclusions: options.opacityExclusions || [],
    profileId: options.profileId ?? null,
    updateProfileId: options.updateProfileId ?? true,
    ready: options.ready ?? true,
  });
}

void test("equivalent document inputs keep a stable application signature", () => {
  const firstAppearance = appearance();
  const secondAppearance = { ...firstAppearance };
  assert.equal(
    signature({ appearance: firstAppearance }),
    signature({ appearance: secondAppearance }),
  );

  const nonMatching = exclusion({ matchValue: "Notes/Elsewhere.md" });
  assert.equal(
    signature({ opacityExclusions: [] }),
    signature({ opacityExclusions: [nonMatching] }),
  );
});

void test("source-only appearance fields do not invalidate render work", () => {
  const baseline = appearance({ wallpaperPath: "Wallpapers/a.webp" });
  assert.equal(
    signature({ appearance: baseline }),
    signature({ appearance: { ...baseline, wallpaperPath: "Wallpapers/b.webp" } }),
  );
  assert.equal(
    signature({ appearance: baseline }),
    signature({ appearance: { ...baseline, wallpaperPoolEnabled: true } }),
  );
  assert.equal(
    signature({ appearance: baseline }),
    signature({ appearance: { ...baseline, wallpaperPoolIncludeSubfolders: true } }),
  );
});

void test("appearance and matched opacity changes invalidate the signature", () => {
  assert.notEqual(
    signature({ appearance: appearance({ opacity: 20 }) }),
    signature({ appearance: appearance({ opacity: 21 }) }),
  );
  assert.notEqual(
    signature({ opacityExclusions: [] }),
    signature({ opacityExclusions: [exclusion()] }),
  );
});

void test("media readiness and profile binding invalidate only when they affect output", () => {
  assert.notEqual(signature({ ready: false }), signature({ ready: true }));
  assert.notEqual(
    signature({ profileId: "scene-a", updateProfileId: true }),
    signature({ profileId: "scene-b", updateProfileId: true }),
  );
  assert.equal(
    signature({ profileId: "scene-a", updateProfileId: false }),
    signature({ profileId: "scene-b", updateProfileId: false }),
  );
});

void test("document appearance returns before DOM work when the signature is unchanged", () => {
  assert.match(
    appearanceSource,
    /if \(state\.applicationSignature === applicationSignature\) return;/,
  );
  const guardIndex = appearanceSource.indexOf(
    "if (state.applicationSignature === applicationSignature) return;",
  );
  const firstStyleWrite = appearanceSource.indexOf("state.layer.style.setProperty");
  assert.ok(guardIndex >= 0 && firstStyleWrite > guardIndex);
});

void test("changed appearances skip unchanged per-property DOM writes", () => {
  assert.ok(
    appearanceSource.includes(
      "if (state.layer.dataset.colorOverlay !== colorOverlay)",
    ),
  );
  assert.ok(
    appearanceSource.includes(
      "if (state.layer.dataset.reduceMotion !== reduceMotion)",
    ),
  );
  assert.ok(
    appearanceSource.includes(
      "document.body.style.getPropertyValue(PANE_OPACITY_VARIABLE) !== paneOpacityValue",
    ),
  );
  assert.ok(
    appearanceSource.includes(
      "document.body.classList.contains(PANE_CONTENT_CLASS) !== fadePaneContent",
    ),
  );
  assert.ok(
    appearanceSource.includes(
      "!document.body.classList.contains(BODY_CLASS)",
    ),
  );
});

void test("playback skips redundant animation and pause mutations", () => {
  assert.match(
    lifecycleSource,
    /if \(state\.layer\.dataset\.animationPaused !== animationPaused\)/,
  );
  assert.match(lifecycleSource, /if \(!video\.paused\) video\.pause\(\);/);
});
