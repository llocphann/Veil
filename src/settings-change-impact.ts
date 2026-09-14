import { appearanceFromSettings, type VeilSettings } from "./settings";
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

function equalValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  return JSON.stringify(left) === JSON.stringify(right);
}

function profileWallpaperPaths(settings: VeilSettings): Array<[string, string]> {
  return settings.profiles
    .map((profile) => [profile.id, profile.wallpaperPath] as [string, string])
    .sort(([left], [right]) => left.localeCompare(right));
}

function ruleWallpaperPaths(settings: VeilSettings): Array<[string, string]> {
  return settings.wallpaperRules
    .map((rule) => [rule.id, rule.wallpaperPath] as [string, string])
    .sort(([left], [right]) => left.localeCompare(right));
}

export function classifySettingsChange(
  previous: VeilSettings,
  next: VeilSettings,
): SettingsChangeImpact {
  const enabled = previous.enabled !== next.enabled;
  const globalAppearance = !equalValue(
    appearanceFromSettings(previous),
    appearanceFromSettings(next),
  );
  const profiles = !equalValue(previous.profiles, next.profiles);
  const wallpaperRules = !equalValue(previous.wallpaperRules, next.wallpaperRules);
  const opacityExclusions = !equalValue(previous.opacityExclusions, next.opacityExclusions);
  const libraryRecent = previous.wallpaperPath !== next.wallpaperPath
    || !equalValue(profileWallpaperPaths(previous), profileWallpaperPaths(next))
    || !equalValue(ruleWallpaperPaths(previous), ruleWallpaperPaths(next));
  const visibleDocumentChange =
    globalAppearance || profiles || wallpaperRules || opacityExclusions;

  return {
    enabled,
    globalAppearance,
    profiles,
    wallpaperRules,
    opacityExclusions,
    libraryRecent,
    sceneRuntime: profiles,
    poolRuntime: wallpaperPoolConfigurationChanged(previous, next),
    routingSchedule: enabled || wallpaperRules || opacityExclusions,
    documentResolution: enabled || (next.enabled && visibleDocumentChange),
  };
}
