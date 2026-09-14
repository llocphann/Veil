import { duplicateSceneProfile } from "./scene-profile-actions";
import {
  createOpacityExclusionRule,
  createProfile,
  createWallpaperRule,
  type OpacityExclusionRule,
  type VeilProfile,
  type VeilSettings,
  type WallpaperRule,
} from "./settings";

export interface DeletedSceneCollections {
  profiles: VeilProfile[];
  wallpaperRules: WallpaperRule[];
}

export function appendScene(settings: VeilSettings): VeilProfile[] {
  return [
    ...settings.profiles,
    createProfile(settings.profiles, settings),
  ];
}

export function reorderScenes(
  profiles: readonly VeilProfile[],
  oldIndex: number,
  newIndex: number,
): VeilProfile[] | null {
  const next = [...profiles];
  const [profile] = next.splice(oldIndex, 1);
  if (!profile) return null;
  next.splice(newIndex, 0, profile);
  return next;
}

export function duplicateScene(
  settings: VeilSettings,
  id: string,
): VeilProfile[] | null {
  const index = settings.profiles.findIndex((profile) => profile.id === id);
  if (index < 0) return null;
  const source = settings.profiles[index];
  if (!source) return null;
  const duplicate = duplicateSceneProfile(
    settings.profiles,
    source,
    settings,
  );
  const profiles = [...settings.profiles];
  profiles.splice(index + 1, 0, duplicate);
  return profiles;
}

export function copyGlobalAppearanceToScene(
  settings: VeilSettings,
  id: string,
): VeilProfile[] | null {
  const current = settings.profiles.find((profile) => profile.id === id);
  if (!current) return null;
  const copied = createProfile([], settings);
  const profile: VeilProfile = { ...copied, id: current.id, name: current.name };
  return settings.profiles.map((candidate) =>
    candidate.id === id ? profile : candidate);
}

export function deleteScene(
  settings: VeilSettings,
  id: string,
): DeletedSceneCollections | null {
  const profile = settings.profiles.find((candidate) => candidate.id === id);
  if (!profile) return null;
  return {
    profiles: settings.profiles.filter((candidate) => candidate.id !== id),
    wallpaperRules: settings.wallpaperRules.map((rule) =>
      rule.profileId === id
        ? { ...rule, profileId: "", wallpaperPath: profile.wallpaperPath }
        : rule,
    ),
  };
}

export function appendWallpaperRule(
  rules: readonly WallpaperRule[],
): WallpaperRule[] {
  return [
    ...rules,
    createWallpaperRule([...rules]),
  ];
}

export function reorderWallpaperRules(
  rules: readonly WallpaperRule[],
  oldIndex: number,
  newIndex: number,
): WallpaperRule[] | null {
  return reorderCollection(rules, oldIndex, newIndex);
}

export function deleteWallpaperRule(
  rules: readonly WallpaperRule[],
  id: string,
): WallpaperRule[] | null {
  const next = rules.filter((rule) => rule.id !== id);
  return next.length === rules.length ? null : next;
}

export function appendOpacityExclusion(
  rules: readonly OpacityExclusionRule[],
): OpacityExclusionRule[] {
  return [
    ...rules,
    createOpacityExclusionRule([...rules]),
  ];
}

export function reorderOpacityExclusions(
  rules: readonly OpacityExclusionRule[],
  oldIndex: number,
  newIndex: number,
): OpacityExclusionRule[] | null {
  return reorderCollection(rules, oldIndex, newIndex);
}

export function deleteOpacityExclusion(
  rules: readonly OpacityExclusionRule[],
  id: string,
): OpacityExclusionRule[] | null {
  const next = rules.filter((rule) => rule.id !== id);
  return next.length === rules.length ? null : next;
}

function reorderCollection<T>(
  values: readonly T[],
  oldIndex: number,
  newIndex: number,
): T[] | null {
  const next = [...values];
  const [value] = next.splice(oldIndex, 1);
  if (!value) return null;
  next.splice(newIndex, 0, value);
  return next;
}
