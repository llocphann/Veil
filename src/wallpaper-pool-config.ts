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

function poolFolder(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator >= 0 ? path.slice(0, separator) : "";
}

function poolSelectionKey(configuration: PoolConfiguration): string {
  return `${configuration.id}|${poolFolder(configuration.wallpaperPath)}|${
    configuration.includeSubfolders ? "recursive" : "direct"
  }`;
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

/**
 * Preserve session pool selections when Obsidian reports a vault rename.
 *
 * Pool selection keys include the anchor folder, so a folder rename must move
 * both the map key and its selected path. The returned context IDs tell the
 * caller which configuration changes are rename-equivalent and therefore must
 * not be invalidated like a user-selected anchor/scope change.
 */
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
      || rewrite(previousConfiguration.wallpaperPath) !== nextConfiguration.wallpaperPath
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
