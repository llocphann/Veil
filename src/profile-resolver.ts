import { matchingWallpaperRule, type NoteContext } from "./context-rules";
import {
  copyAppearance,
  type VeilAppearance,
  type VeilProfile,
  type VeilSettings,
  type WallpaperRule,
} from "./settings";

export interface ResolvedWallpaper {
  rule: WallpaperRule | null;
  profile: VeilProfile | null;
  path: string;
  appearance: VeilAppearance;
}

/**
 * Resolve one document's scene without changing legacy 1.3 rule semantics.
 * A profile-backed rule switches the complete appearance. An inline rule only
 * replaces the wallpaper path and continues to use the global appearance.
 */
export function resolveWallpaper(
  settings: VeilSettings,
  context: NoteContext | null,
): ResolvedWallpaper {
  const rule = matchingWallpaperRule(settings.wallpaperRules, context);
  const profile = rule?.profileId
    ? settings.profiles.find((candidate) => candidate.id === rule.profileId) || null
    : null;

  if (profile) {
    return {
      rule,
      profile,
      path: profile.wallpaperPath,
      appearance: copyAppearance(profile),
    };
  }

  const appearance = copyAppearance(settings);
  return {
    rule,
    profile: null,
    path: rule?.wallpaperPath || settings.wallpaperPath,
    appearance,
  };
}
