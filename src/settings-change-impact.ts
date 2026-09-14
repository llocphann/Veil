import {
  veilAppearanceEqual,
  veilOpacityExclusionsEqual,
  veilProfilesEqual,
  veilWallpaperRulesEqual,
} from "./settings-change-detection";
import type { VeilSettings } from "./settings";
import { wallpaperPoolConfigurationChanged } from "./wallpaper-pool-config";

export interface SettingsChangeImpact {
  enabled: boolean;
  globalAppearance: boolean;
  profiles: boolean;
  wallpaperRules: boolean;
  opacityExclusions: boolean;
  libraryRecent: boolean;
  sceneRuntime: boolean;
  poolRuntime: boolean;
  routingSchedule: boolean;
  documentResolution: boolean;
}

function wallpaperPathsChanged(
  previous: readonly { id: string; wallpaperPath: string }[],
  next: readonly { id: string; wallpaperPath: string }[],
): boolean {
  if (previous === next) return false;
  if (previous.length !== next.length) return true;
  const before = new Map(previous.map((item) => [item.id, item.wallpaperPath]));
  for (const item of next) {
    if (before.get(item.id) !== item.wallpaperPath) return true;
  }
  return false;
}

function defaultPoolConfigurationChanged(previous: VeilSettings, next: VeilSettings): boolean {
  return previous.wallpaperPoolEnabled !== next.wallpaperPoolEnabled
    || previous.wallpaperPoolFolder !== next.wallpaperPoolFolder
    || previous.wallpaperPoolIncludeSubfolders !== next.wallpaperPoolIncludeSubfolders
    || previous.wallpaperPoolChangeInterval !== next.wallpaperPoolChangeInterval;
}

export function classifySettingsChange(
  previous: VeilSettings,
  next: VeilSettings,
): SettingsChangeImpact {
  const enabled = previous.enabled !== next.enabled;
  const globalAppearance = !veilAppearanceEqual(previous, next);
  const profiles = !veilProfilesEqual(previous.profiles, next.profiles);
  const wallpaperRules = !veilWallpaperRulesEqual(previous.wallpaperRules, next.wallpaperRules);
  const opacityExclusions = !veilOpacityExclusionsEqual(
    previous.opacityExclusions,
    next.opacityExclusions,
  );
  const libraryRecent = previous.wallpaperPath !== next.wallpaperPath
    || wallpaperPathsChanged(previous.profiles, next.profiles)
    || wallpaperPathsChanged(previous.wallpaperRules, next.wallpaperRules);
  const visibleDocumentChange =
    globalAppearance || profiles || wallpaperRules || opacityExclusions;
  const poolRuntime = defaultPoolConfigurationChanged(previous, next)
    || (profiles && wallpaperPoolConfigurationChanged(previous, next));

  return {
    enabled,
    globalAppearance,
    profiles,
    wallpaperRules,
    opacityExclusions,
    libraryRecent,
    sceneRuntime: profiles,
    poolRuntime,
    routingSchedule: enabled || wallpaperRules || opacityExclusions,
    documentResolution: enabled || (next.enabled && visibleDocumentChange),
  };
}
