import type { VeilSettings } from "./settings";

interface PoolConfiguration {
  id: string;
  folder: string;
  enabled: boolean;
  includeSubfolders: boolean;
  changeInterval: number;
}

function configurationFor(
  id: string,
  folder: string,
  enabled: boolean,
  includeSubfolders: boolean,
  changeInterval: number,
): PoolConfiguration {
  return { id, folder, enabled, includeSubfolders, changeInterval };
}

function configurationEqual(left: PoolConfiguration, right: PoolConfiguration): boolean {
  return selectionConfigurationEqual(left, right)
    && left.changeInterval === right.changeInterval;
}

function selectionConfigurationEqual(left: PoolConfiguration, right: PoolConfiguration): boolean {
  return left.folder === right.folder
    && left.enabled === right.enabled
    && left.includeSubfolders === right.includeSubfolders;
}

function poolSelectionKey(configuration: PoolConfiguration): string {
  return `${configuration.id}|${configuration.folder}|${
    configuration.includeSubfolders ? "recursive" : "direct"
  }`;
}

function poolCandidateCacheKey(configuration: PoolConfiguration): string | null {
  if (!configuration.enabled) return null;
  return `${configuration.folder}|${
    configuration.includeSubfolders ? "recursive" : "direct"
  }`;
}

export function wallpaperPoolConfiguration(settings: VeilSettings): PoolConfiguration[] {
  return [
    configurationFor(
      "default",
      settings.wallpaperPoolFolder,
      settings.wallpaperPoolEnabled,
      settings.wallpaperPoolIncludeSubfolders,
      settings.wallpaperPoolChangeInterval,
    ),
    ...settings.profiles
      .map((profile) => configurationFor(
        `profile:${profile.id}`,
        profile.wallpaperPoolFolder,
        profile.wallpaperPoolEnabled,
        profile.wallpaperPoolIncludeSubfolders,
        profile.wallpaperPoolChangeInterval,
      ))
      .sort((left, right) => left.id.localeCompare(right.id)),
  ];
}

function configurationChanges(
  previous: VeilSettings,
  next: VeilSettings,
  equal: (left: PoolConfiguration, right: PoolConfiguration) => boolean,
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
        || !equal(previousConfiguration, nextConfiguration);
    })
    .sort((left, right) => left.localeCompare(right));
}

export function wallpaperPoolConfigurationChanges(
  previous: VeilSettings,
  next: VeilSettings,
): string[] {
  return configurationChanges(previous, next, configurationEqual);
}

export function wallpaperPoolSelectionConfigurationChanges(
  previous: VeilSettings,
  next: VeilSettings,
): string[] {
  return configurationChanges(previous, next, selectionConfigurationEqual);
}

export function staleWallpaperPoolCandidateCacheKeys(
  previous: VeilSettings,
  next: VeilSettings,
): string[] {
  const before = new Set<string>();
  const after = new Set<string>();
  for (const configuration of wallpaperPoolConfiguration(previous)) {
    const key = poolCandidateCacheKey(configuration);
    if (key) before.add(key);
  }
  for (const configuration of wallpaperPoolConfiguration(next)) {
    const key = poolCandidateCacheKey(configuration);
    if (key) after.add(key);
  }
  return Array.from(before)
    .filter((key) => !after.has(key))
    .sort((left, right) => left.localeCompare(right));
}

export function wallpaperPoolConfigurationChanged(
  previous: VeilSettings,
  next: VeilSettings,
): boolean {
  return wallpaperPoolConfigurationChanges(previous, next).length > 0;
}

export function wallpaperPoolChangeIntervalForContext(
  settings: VeilSettings,
  contextKey: string,
): number {
  const configuration = wallpaperPoolConfiguration(settings)
    .find((candidate) => candidate.id === contextKey);
  return configuration?.enabled ? configuration.changeInterval : 0;
}

export function rewriteWallpaperPoolSelectionPaths(
  selections: Map<string, string>,
  rewrite: (path: string) => string,
): boolean {
  let changed = false;
  for (const [key, path] of selections) {
    const next = rewrite(path);
    if (next === path) continue;
    selections.set(key, next);
    changed = true;
  }
  return changed;
}

/** Preserve session pool selections when Obsidian reports a vault rename. */
export function rewriteWallpaperPoolSelectionsForRename(
  selections: Map<string, string>,
  previous: VeilSettings,
  next: VeilSettings,
  rewrite: (path: string) => string,
): string[] {
  const before = new Map(
    wallpaperPoolConfiguration(previous).map((configuration) => [configuration.id, configuration]),
  );
  const after = new Map(
    wallpaperPoolConfiguration(next).map((configuration) => [configuration.id, configuration]),
  );
  const preserved = new Set<string>();

  for (const [id, previousConfiguration] of before) {
    const nextConfiguration = after.get(id);
    if (!nextConfiguration) continue;
    if (
      previousConfiguration.enabled !== nextConfiguration.enabled
      || previousConfiguration.includeSubfolders !== nextConfiguration.includeSubfolders
      || previousConfiguration.changeInterval !== nextConfiguration.changeInterval
      || rewrite(previousConfiguration.folder) !== nextConfiguration.folder
    ) {
      continue;
    }

    preserved.add(id);
    const previousKey = poolSelectionKey(previousConfiguration);
    if (!selections.has(previousKey)) continue;
    const selectedPath = selections.get(previousKey) || "";
    const nextKey = poolSelectionKey(nextConfiguration);
    const nextSelectedPath = rewrite(selectedPath);
    if (previousKey !== nextKey) selections.delete(previousKey);
    selections.set(nextKey, nextSelectedPath);
  }

  return Array.from(preserved).sort((left, right) => left.localeCompare(right));
}
