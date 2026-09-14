import { normalizePath } from "obsidian";
import { normalizeSettings, type VeilSettings } from "./settings";

export interface VaultRenameSettingsResult {
  settings: VeilSettings;
  changed: boolean;
  rewritePath: (value: string) => string;
}

export function rewriteSettingsForVaultRename(
  settings: VeilSettings,
  oldPath: string,
  newPath: string,
): VaultRenameSettingsResult {
  const rewritePath = (value: string): string =>
    value === oldPath || value.startsWith(`${oldPath}/`)
      ? newPath + value.slice(oldPath.length)
      : value;
  const next = normalizeSettings(settings, normalizePath);
  let changed = false;

  const wallpaperPath = rewritePath(next.wallpaperPath);
  if (wallpaperPath !== next.wallpaperPath) {
    next.wallpaperPath = wallpaperPath;
    changed = true;
  }

  for (const profile of next.profiles) {
    const path = rewritePath(profile.wallpaperPath);
    if (path !== profile.wallpaperPath) {
      profile.wallpaperPath = path;
      changed = true;
    }
  }

  for (const rule of next.wallpaperRules) {
    const path = rewritePath(rule.wallpaperPath);
    if (path !== rule.wallpaperPath) {
      rule.wallpaperPath = path;
      changed = true;
    }
    if (rule.matchType === "path" || rule.matchType === "folder") {
      const matchValue = rewritePath(rule.matchValue);
      if (matchValue !== rule.matchValue) {
        rule.matchValue = matchValue;
        changed = true;
      }
    }
  }

  for (const rule of next.opacityExclusions) {
    if (rule.matchType !== "path" && rule.matchType !== "folder") continue;
    const matchValue = rewritePath(rule.matchValue);
    if (matchValue !== rule.matchValue) {
      rule.matchValue = matchValue;
      changed = true;
    }
  }

  return { settings: next, changed, rewritePath };
}
