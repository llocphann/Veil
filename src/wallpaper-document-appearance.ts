import {
  matchingOpacityExclusions,
  type NoteContext,
} from "./context-rules";
import type {
  OpacityExclusionRule,
  VeilAppearance,
} from "./settings";
import type { WallpaperDocumentState } from "./wallpaper-document-state";

const BODY_CLASS = "vault-dashboard-background";
const PANE_OPACITY_VARIABLE = "--vault-dashboard-pane-opacity";
const PANE_CONTENT_CLASS = "vault-dashboard-fade-pane-content";
const PANE_CONTENT_OPACITY_VARIABLE = "--vault-dashboard-pane-content-opacity";
const LEGACY_IMAGE_VARIABLE = "--vault-dashboard-banner-image";

export interface DocumentAppearanceOptions {
  document: Document;
  state: WallpaperDocumentState;
  context: NoteContext | null;
  appearance: VeilAppearance;
  opacityExclusions: readonly OpacityExclusionRule[];
  profileId: string | null;
  updateProfileId: boolean;
}

export function applyDocumentAppearance(options: DocumentAppearanceOptions): void {
  const {
    document,
    state,
    context,
    appearance,
    opacityExclusions,
    profileId,
    updateProfileId,
  } = options;
  state.appearance = appearance;

  const filters: string[] = [];
  if (appearance.blurEnabled && appearance.blurIntensity > 0) {
    filters.push(`blur(${appearance.blurIntensity}px)`);
  }
  if (appearance.dimEnabled && appearance.dimIntensity > 0) {
    filters.push(`brightness(${1 - appearance.dimIntensity / 100})`);
  }
  const effectStrength = appearance.effectIntensity / 100;
  if (appearance.effectPreset === "retro" && effectStrength > 0) {
    filters.push(
      `sepia(${(effectStrength * 0.72).toFixed(2)})`,
      `saturate(${(1 + effectStrength * 0.5).toFixed(2)})`,
      `contrast(${(1 + effectStrength * 0.14).toFixed(2)})`,
    );
  }
  const effectBleed = appearance.effectPreset === "glitch" ? 8 : 0;
  const mediaScale = appearance.wallpaperZoom / 100;
  const variables: Record<string, string> = {
    "--vdb-opacity": String(appearance.opacity / 100),
    "--vdb-fit": appearance.displayMode,
    "--vdb-position-x": `${appearance.wallpaperPositionX}%`,
    "--vdb-position-y": `${appearance.wallpaperPositionY}%`,
    "--vdb-media-scale": String(mediaScale),
    "--vdb-glitch-scale": String(mediaScale * 1.01),
    "--vdb-transition-duration": `${appearance.transitionDuration}ms`,
    "--vdb-filter": filters.length ? filters.join(" ") : "none",
    "--vdb-blur-bleed": `${
      (appearance.blurEnabled ? appearance.blurIntensity * 2 : 0) + effectBleed
    }px`,
    "--vdb-vignette-shape": appearance.vignetteMode === "circle" ? "circle" : "ellipse",
    "--vdb-vignette-intensity": String(appearance.vignetteIntensity / 100),
    "--vdb-vignette-radius": `${appearance.vignetteRadius}%`,
    "--vdb-overlay-color": appearance.colorOverlayColor,
    "--vdb-overlay-opacity": String(appearance.colorOverlayOpacity / 100),
    "--vdb-overlay-blend-mode": appearance.colorOverlayBlendMode,
    "--vdb-effect-opacity": String(0.08 + effectStrength * 0.42),
    "--vdb-effect-shift": `${Math.max(1, Math.round(effectStrength * 7))}px`,
    "--vdb-effect-speed": `${Math.max(90, Math.round(420 - effectStrength * 300))}ms`,
  };
  for (const [name, value] of Object.entries(variables)) {
    if (state.layer.style.getPropertyValue(name) !== value) {
      state.layer.style.setProperty(name, value);
    }
  }

  state.layer.dataset.colorOverlay = String(
    appearance.colorOverlayEnabled && appearance.colorOverlayOpacity > 0,
  );
  state.layer.dataset.effect = appearance.effectIntensity > 0
    ? appearance.effectPreset
    : "none";
  state.layer.dataset.reduceMotion = String(appearance.respectReducedMotion);
  if (updateProfileId) {
    if (profileId) state.layer.dataset.profileId = profileId;
    else delete state.layer.dataset.profileId;
  }

  state.vignette.hidden =
    appearance.vignetteMode === "off" || appearance.vignetteIntensity === 0;
  const exclusions = matchingOpacityExclusions(opacityExclusions, context);
  const paneOpacity = exclusions.paneSurface ? 100 : appearance.paneOpacity;
  const paneContentOpacity = exclusions.paneContent ? 100 : appearance.paneContentOpacity;
  if (!state.failed) document.body.style.setProperty(PANE_OPACITY_VARIABLE, `${paneOpacity}%`);
  const fadePaneContent = !state.failed && paneContentOpacity < 100;
  document.body.classList.toggle(PANE_CONTENT_CLASS, fadePaneContent);
  if (fadePaneContent) {
    document.body.style.setProperty(
      PANE_CONTENT_OPACITY_VARIABLE,
      String(paneContentOpacity / 100),
    );
  } else {
    document.body.style.removeProperty(PANE_CONTENT_OPACITY_VARIABLE);
  }
  document.body.style.removeProperty(LEGACY_IMAGE_VARIABLE);
  if (state.ready && !state.failed) document.body.classList.add(BODY_CLASS);
}

export function restoreDocumentAppearance(document: Document): void {
  document.body?.classList.remove(BODY_CLASS, PANE_CONTENT_CLASS);
  document.body?.style.removeProperty(PANE_OPACITY_VARIABLE);
  document.body?.style.removeProperty(PANE_CONTENT_OPACITY_VARIABLE);
  document.body?.style.removeProperty(LEGACY_IMAGE_VARIABLE);
}
