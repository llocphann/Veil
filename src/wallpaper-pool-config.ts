import type { VeilSettings } from "./settings";

interface PoolConfiguration {
  id: string;
  wallpaperPath: string;
  enabled: boolean;
  includeSubfolders: boolean;
}

function configurationFor(
  id: string,
  wallpaperPath: string,
  enabled: boolean,
  includeSubfolders: boolean,
): PoolConfiguration {
  return { id, wallpaperPath, enabled, includeSubfolders };
}

export function wallpaperPoolConfiguration(settings: VeilSettings): PoolConfiguration[] {
  return [
    configurationFor(
      "default",
      settings.wallpaperPath,
      settings.wallpaperPoolEnabled,
      settings.wallpaperPoolIncludeSubfolders,
    ),
    ...settings.profiles
      .map((profile) => configurationFor(
        profile.id,
        profile.wallpaperPath,
        profile.wallpaperPoolEnabled,
        profile.wallpaperPoolIncludeSubfolders,
      ))
      .sort((left, right) => left.id.localeCompare(right.id)),
  ];
}

export function wallpaperPoolConfigurationChanged(
  previous: VeilSettings,
  next: VeilSettings,
): boolean {
  const before = wallpaperPoolConfiguration(previous);
  const after = wallpaperPoolConfiguration(next);
  if (before.length !== after.length) return true;
  return before.some((entry, index) => {
    const candidate = after[index];
    return !candidate
      || entry.id !== candidate.id
      || entry.wallpaperPath !== candidate.wallpaperPath
      || entry.enabled !== candidate.enabled
      || entry.includeSubfolders !== candidate.includeSubfolders;
  });
}
