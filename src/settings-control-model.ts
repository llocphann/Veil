import {
  DEFAULT_SETTINGS,
  MATCH_TYPES,
  type MatchType,
  type OpacityExclusionRule,
  type VeilProfile,
  type VeilSettings,
  type WallpaperRule,
} from "./settings";

export type RuleKind = "wallpaper" | "opacity";

export interface ProfileControlKey {
  id: string;
  field: string;
}

export interface RuleControlKey {
  kind: RuleKind;
  id: string;
  field: string;
}

const DYNAMIC_GLOBAL_KEYS = new Set<string>([
  "wallpaperPoolEnabled",
  "vignetteMode",
  "blurEnabled",
  "dimEnabled",
  "colorOverlayEnabled",
  "effectPreset",
]);

const DYNAMIC_PROFILE_FIELDS = new Set<string>([
  "name",
  "wallpaperPath",
  "wallpaperPoolEnabled",
  "vignetteMode",
  "blurEnabled",
  "dimEnabled",
  "colorOverlayEnabled",
  "effectPreset",
]);

const DYNAMIC_RULE_FIELDS = new Set<string>([
  "matchType",
  "enabled",
  "profileId",
  "excludePaneSurface",
  "excludePaneContent",
]);

export function parseProfileControlKey(key: string): ProfileControlKey | null {
  const [prefix, id, ...fieldParts] = key.split(":");
  if (prefix !== "profile" || !id || fieldParts.length === 0) return null;
  return { id, field: fieldParts.join(":") };
}

export function parseRuleControlKey(key: string): RuleControlKey | null {
  const [prefix, id, ...fieldParts] = key.split(":");
  if (!id || fieldParts.length === 0) return null;
  if (prefix !== "wallpaper-rule" && prefix !== "opacity-rule") return null;
  return {
    kind: prefix === "wallpaper-rule" ? "wallpaper" : "opacity",
    id,
    field: fieldParts.join(":"),
  };
}

export function findProfile(
  settings: VeilSettings,
  id: string,
): VeilProfile | undefined {
  return settings.profiles.find((profile) => profile.id === id);
}

export function findRule(
  settings: VeilSettings,
  kind: RuleKind,
  id: string,
): WallpaperRule | OpacityExclusionRule | undefined {
  return kind === "wallpaper"
    ? settings.wallpaperRules.find((rule) => rule.id === id)
    : settings.opacityExclusions.find((rule) => rule.id === id);
}

export function controlValue(settings: VeilSettings, key: string): unknown {
  const profileKey = parseProfileControlKey(key);
  if (profileKey) {
    const profile = findProfile(settings, profileKey.id);
    return profile
      ? (profile as unknown as Record<string, unknown>)[profileKey.field]
      : undefined;
  }

  const ruleKey = parseRuleControlKey(key);
  if (ruleKey) {
    const rule = findRule(settings, ruleKey.kind, ruleKey.id);
    return rule
      ? (rule as unknown as Record<string, unknown>)[ruleKey.field]
      : undefined;
  }

  if (!(key in DEFAULT_SETTINGS)) return undefined;
  return settings[key as keyof VeilSettings];
}

export function setRuleControlValue(
  rule: WallpaperRule | OpacityExclusionRule,
  field: string,
  value: unknown,
): void {
  if (field === "enabled") {
    rule.enabled = value === true;
    return;
  }
  if (field === "excludePaneSurface" && "excludePaneSurface" in rule) {
    rule.excludePaneSurface = value === true;
    return;
  }
  if (field === "excludePaneContent" && "excludePaneContent" in rule) {
    rule.excludePaneContent = value === true;
    return;
  }
  if (field === "matchType") {
    rule.matchType = Object.keys(MATCH_TYPES).includes(String(value))
      ? value as MatchType
      : "path";
    return;
  }
  if (field === "matchValue") {
    rule.matchValue = typeof value === "string" ? value : "";
    return;
  }
  if (field === "profileId" && "profileId" in rule) {
    rule.profileId = typeof value === "string" ? value : "";
    return;
  }
  if (field === "wallpaperPath" && "wallpaperPath" in rule) {
    rule.wallpaperPath = typeof value === "string" ? value : "";
  }
}

export function globalControlRequiresRender(key: string): boolean {
  return DYNAMIC_GLOBAL_KEYS.has(key);
}

export function profileControlRequiresRender(field: string): boolean {
  return DYNAMIC_PROFILE_FIELDS.has(field);
}

export function ruleControlRequiresRender(field: string): boolean {
  return DYNAMIC_RULE_FIELDS.has(field);
}
