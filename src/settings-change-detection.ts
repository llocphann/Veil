import type {
  OpacityExclusionRule,
  VeilAppearance,
  VeilProfile,
  VeilSettings,
  WallpaperRule,
} from "./settings";

const APPEARANCE_KEYS = [
  "wallpaperPath",
  "wallpaperPoolEnabled",
  "wallpaperPoolFolder",
  "wallpaperPoolIncludeSubfolders",
  "wallpaperPoolChangeInterval",
  "displayMode",
  "wallpaperPositionX",
  "wallpaperPositionY",
  "wallpaperZoom",
  "transitionDuration",
  "opacity",
  "paneOpacity",
  "paneContentOpacity",
  "vignetteMode",
  "vignetteIntensity",
  "vignetteRadius",
  "blurEnabled",
  "blurIntensity",
  "dimEnabled",
  "dimIntensity",
  "colorOverlayEnabled",
  "colorOverlayColor",
  "colorOverlayOpacity",
  "colorOverlayBlendMode",
  "effectPreset",
  "effectIntensity",
  "pauseWhenHidden",
  "respectReducedMotion",
] as const satisfies readonly (keyof VeilAppearance)[];

type AppearanceLike = Pick<VeilSettings, keyof VeilAppearance> | VeilAppearance;

export function veilAppearanceEqual(left: AppearanceLike, right: AppearanceLike): boolean {
  if (left === right) return true;
  for (const key of APPEARANCE_KEYS) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

function profileEqual(left: VeilProfile, right: VeilProfile): boolean {
  return left === right
    || (left.id === right.id
      && left.name === right.name
      && veilAppearanceEqual(left, right));
}

function wallpaperRuleEqual(left: WallpaperRule, right: WallpaperRule): boolean {
  return left === right
    || (left.id === right.id
      && left.enabled === right.enabled
      && left.matchType === right.matchType
      && left.matchValue === right.matchValue
      && left.profileId === right.profileId
      && left.wallpaperPath === right.wallpaperPath);
}

function opacityExclusionEqual(
  left: OpacityExclusionRule,
  right: OpacityExclusionRule,
): boolean {
  return left === right
    || (left.id === right.id
      && left.enabled === right.enabled
      && left.matchType === right.matchType
      && left.matchValue === right.matchValue
      && left.excludePaneSurface === right.excludePaneSurface
      && left.excludePaneContent === right.excludePaneContent);
}

function arrayEqual<T>(
  left: readonly T[],
  right: readonly T[],
  itemEqual: (left: T, right: T) => boolean,
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!itemEqual(left[index], right[index])) return false;
  }
  return true;
}

export function veilProfilesEqual(
  left: readonly VeilProfile[],
  right: readonly VeilProfile[],
): boolean {
  return arrayEqual(left, right, profileEqual);
}

export function veilWallpaperRulesEqual(
  left: readonly WallpaperRule[],
  right: readonly WallpaperRule[],
): boolean {
  return arrayEqual(left, right, wallpaperRuleEqual);
}

export function veilOpacityExclusionsEqual(
  left: readonly OpacityExclusionRule[],
  right: readonly OpacityExclusionRule[],
): boolean {
  return arrayEqual(left, right, opacityExclusionEqual);
}

export function veilSettingsEqual(previous: VeilSettings, next: VeilSettings): boolean {
  if (previous === next) return true;
  return previous.enabled === next.enabled
    && veilAppearanceEqual(previous, next)
    && veilProfilesEqual(previous.profiles, next.profiles)
    && veilWallpaperRulesEqual(previous.wallpaperRules, next.wallpaperRules)
    && veilOpacityExclusionsEqual(previous.opacityExclusions, next.opacityExclusions);
}
