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

function configurationEqual(left: PoolConfiguration, right: PoolConfiguration): boolean {
  return left.wallpaperPath === right.wallpaperPath
    && left.enabled === right.enabled
    && left.includeSubfolders === right.includeSubfolders;
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
        `profile:${profile.id}`,
        profile.wallpaperPath,
        profile.wallpaperPoolEnabled,
        profile.wallpaperPoolIncludeSubfolders,
      ))
      .sort((left, right) => left.id.localeCompare(right.id)),
  ];
}

export function wallpaperPoolConfigurationChanges(
  previous: VeilSettings,
  next: VeilSettings,
): string[] {
  const before = new Map(
    wallpaperPoolConfiguration(previous).map((configuration) => [configuration.id, configuration]),
  );
  const after = new Map(
    wallpaperPoolConfiguration(next).map((configuration) => [configuration.id, configuration]),
  );
  const ids = new Set([...before.keys(), ...after.keys()]);
  return Array.from(ids)
    .filter((id) => {
      const previousConfiguration = before.get(id);
      const nextConfiguration = after.get(id);
      return !previousConfiguration
        || !nextConfiguration
        || !configurationEqual(previousConfiguration, nextConfiguration);
    })
    .sort((left, right) => left.localeCompare(right));
}

export function wallpaperPoolConfigurationChanged(
  previous: VeilSettings,
  next: VeilSettings,
): boolean {
  return wallpaperPoolConfigurationChanges(previous, next).length > 0;
}
