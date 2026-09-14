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
  "wallpaperPoolFolder",
  "vignetteMode",
  "blurEnabled",
  "dimEnabled",
  "colorOverlayEnabled",
  "effectPreset",
]);

const CONTINUOUS_APPEARANCE_FIELDS = new Set<string>([
  "wallpaperPoolChangeInterval",
  "wallpaperPositionX",
  "wallpaperPositionY",
  "wallpaperZoom",
  "transitionDuration",
  "opacity",
  "paneOpacity",
  "paneContentOpacity",
  "vignetteIntensity",
  "vignetteRadius",
  "blurIntensity",
  "dimIntensity",
  "colorOverlayOpacity",
  "effectIntensity",
]);

// Only rule fields that change the definition tree require a full settings
// rebuild. Enabled/exclusion toggles use immutable rule replacements, so
// refreshDomState() can update page status/display state without recreating
// every routing control.
const DYNAMIC_RULE_FIELDS = new Set<string>([
  "matchType",
  "profileId",
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

export function controlCanFrameCoalesce(key: string): boolean {
  const profileKey = parseProfileControlKey(key);
  if (profileKey) return CONTINUOUS_APPEARANCE_FIELDS.has(profileKey.field);
  if (parseRuleControlKey(key)) return false;
  return CONTINUOUS_APPEARANCE_FIELDS.has(key);
}

export function continuousControlPatch(
  settings: VeilSettings,
  values: ReadonlyMap<string, unknown>,
): Partial<VeilSettings> | null {
  const patch: Partial<VeilSettings> = {};
  let profiles: VeilProfile[] | null = null;
  const clonedProfileIndexes = new Set<number>();
  let changed = false;

  for (const [key, value] of values) {
    if (!controlCanFrameCoalesce(key)) continue;

    const profileKey = parseProfileControlKey(key);
    if (profileKey) {
      const index: number = settings.profiles.findIndex(
        (profile: VeilProfile): boolean => profile.id === profileKey.id,
      );
      if (index < 0) continue;
      const current: VeilProfile | undefined = profiles?.[index] ?? settings.profiles[index];
      if (!current) continue;
      if ((current as unknown as Record<string, unknown>)[profileKey.field] === value) continue;

      if (!profiles) profiles = settings.profiles.slice();
      const source: VeilProfile | undefined = profiles[index];
      if (!source) continue;
      const next: VeilProfile = clonedProfileIndexes.has(index) ? source : { ...source };
      Object.assign(next, { [profileKey.field]: value });
      profiles[index] = next;
      clonedProfileIndexes.add(index);
      changed = true;
      continue;
    }

    if (!(key in DEFAULT_SETTINGS)) continue;
    if (settings[key as keyof VeilSettings] === value) continue;
    Object.assign(patch, { [key]: value });
    changed = true;
  }

  if (profiles) patch.profiles = profiles;
  return changed ? patch : null;
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
