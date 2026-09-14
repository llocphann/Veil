import {
  matchingOpacityExclusions,
  type NoteContext,
} from "./context-rules";
import type {
  OpacityExclusionRule,
  VeilAppearance,
} from "./settings";

export interface WallpaperDocumentSignatureOptions {
  appearance: VeilAppearance;
  context: NoteContext | null;
  opacityExclusions: OpacityExclusionRule[];
  profileId: string | null;
  updateProfileId: boolean;
  ready: boolean;
}

export function wallpaperDocumentApplicationSignature(
  options: WallpaperDocumentSignatureOptions,
): string {
  const {
    appearance,
    context,
    opacityExclusions,
    profileId,
    updateProfileId,
    ready,
  } = options;
  const exclusions = matchingOpacityExclusions(opacityExclusions, context);

  return JSON.stringify([
    appearance.wallpaperPath,
    appearance.wallpaperPoolEnabled,
    appearance.wallpaperPoolIncludeSubfolders,
    appearance.displayMode,
    appearance.wallpaperPositionX,
    appearance.wallpaperPositionY,
    appearance.wallpaperZoom,
    appearance.transitionDuration,
    appearance.opacity,
    appearance.paneOpacity,
    appearance.paneContentOpacity,
    appearance.vignetteMode,
    appearance.vignetteIntensity,
    appearance.vignetteRadius,
    appearance.blurEnabled,
    appearance.blurIntensity,
    appearance.dimEnabled,
    appearance.dimIntensity,
    appearance.colorOverlayEnabled,
    appearance.colorOverlayColor,
    appearance.colorOverlayOpacity,
    appearance.colorOverlayBlendMode,
    appearance.effectPreset,
    appearance.effectIntensity,
    appearance.pauseWhenHidden,
    appearance.respectReducedMotion,
    exclusions.paneSurface,
    exclusions.paneContent,
    updateProfileId ? profileId || "" : null,
    updateProfileId,
    ready,
  ]);
}
