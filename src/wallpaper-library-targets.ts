import type { VeilSettings } from "./settings";

export interface WallpaperLibraryTarget {
  id: string;
  label: string;
  selectedPath: string;
}

export function wallpaperLibraryTargets(settings: VeilSettings): WallpaperLibraryTarget[] {
  return [
    {
      id: "default",
      label: "Default appearance",
      selectedPath: settings.wallpaperPath,
    },
    ...settings.profiles.map((profile) => ({
      id: `profile:${profile.id}`,
      label: `Scene: ${profile.name || profile.id}`,
      selectedPath: profile.wallpaperPath,
    })),
    ...settings.wallpaperRules
      .filter((rule) => !rule.profileId)
      .map((rule) => ({
        id: `rule:${rule.id}`,
        label: `Inline rule: ${rule.matchValue || rule.id}`,
        selectedPath: rule.wallpaperPath,
      })),
  ];
}

export function wallpaperLibraryTargetPatch(
  settings: VeilSettings,
  targetId: string,
  wallpaperPath: string,
): Partial<VeilSettings> | null {
  if (targetId === "default") return { wallpaperPath };

  if (targetId.startsWith("profile:")) {
    const profileId = targetId.slice("profile:".length);
    if (!settings.profiles.some((profile) => profile.id === profileId)) return null;
    return {
      profiles: settings.profiles.map((profile) =>
        profile.id === profileId ? { ...profile, wallpaperPath } : profile,
      ),
    };
  }

  if (targetId.startsWith("rule:")) {
    const ruleId = targetId.slice("rule:".length);
    if (!settings.wallpaperRules.some((rule) => rule.id === ruleId && !rule.profileId)) return null;
    return {
      wallpaperRules: settings.wallpaperRules.map((rule) =>
        rule.id === ruleId && !rule.profileId ? { ...rule, wallpaperPath } : rule,
      ),
    };
  }

  return null;
}
