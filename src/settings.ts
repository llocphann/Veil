export const DISPLAY_MODES = {
  cover: "Fill — crop to fill the window",
  contain: "Fit — show the entire wallpaper",
  none: "Center — original size",
  fill: "Stretch — fill without preserving proportions",
  "scale-down": "Scale down — never enlarge",
} as const;

export type DisplayMode = keyof typeof DISPLAY_MODES;
export type VignetteMode = "off" | "ellipse" | "circle";
export type MediaKind = "image" | "video" | "";

export const COLOR_OVERLAY_BLEND_MODES = {
  color: "Color — recolor while preserving luminance",
  "soft-light": "Soft light — gentle tint",
  overlay: "Overlay — stronger contrast tint",
  multiply: "Multiply — darker tint",
  screen: "Screen — lighter tint",
  normal: "Normal — flat color layer",
} as const;

export const EFFECT_PRESETS = {
  none: "None",
  retro: "Retro film",
  glitch: "Glitch",
  "tv-noise": "TV noise",
} as const;

export type ColorOverlayBlendMode = keyof typeof COLOR_OVERLAY_BLEND_MODES;
export type EffectPreset = keyof typeof EFFECT_PRESETS;

export const MATCH_TYPES = {
  note: "Note name",
  path: "Exact path",
  folder: "Folder",
  tag: "Tag",
} as const;

export type MatchType = keyof typeof MATCH_TYPES;

export interface ContextRule {
  id: string;
  enabled: boolean;
  matchType: MatchType;
  matchValue: string;
}

/**
 * A reusable scene. All appearance/playback values live together so a context
 * rule can switch the complete atmosphere rather than only the media path.
 */
export interface VeilProfile {
  id: string;
  name: string;
  wallpaperPath: string;
  displayMode: DisplayMode;
  opacity: number;
  paneOpacity: number;
  paneContentOpacity: number;
  vignetteMode: VignetteMode;
  vignetteIntensity: number;
  vignetteRadius: number;
  blurEnabled: boolean;
  blurIntensity: number;
  dimEnabled: boolean;
  dimIntensity: number;
  colorOverlayEnabled: boolean;
  colorOverlayColor: string;
  colorOverlayOpacity: number;
  colorOverlayBlendMode: ColorOverlayBlendMode;
  effectPreset: EffectPreset;
  effectIntensity: number;
  pauseWhenHidden: boolean;
  respectReducedMotion: boolean;
}

export interface WallpaperRule extends ContextRule {
  /**
   * Empty means the rule keeps the 1.3 inline-wallpaper behavior. When set,
   * profileId takes precedence and wallpaperPath is retained as a safe legacy
   * fallback for imports/downgrades.
   */
  profileId: string;
  wallpaperPath: string;
}

export interface OpacityExclusionRule extends ContextRule {
  excludePaneSurface: boolean;
  excludePaneContent: boolean;
}

export interface VeilSettings {
  enabled: boolean;
  wallpaperPath: string;
  displayMode: DisplayMode;
  opacity: number;
  paneOpacity: number;
  paneContentOpacity: number;
  vignetteMode: VignetteMode;
  vignetteIntensity: number;
  vignetteRadius: number;
  blurEnabled: boolean;
  blurIntensity: number;
  dimEnabled: boolean;
  dimIntensity: number;
  colorOverlayEnabled: boolean;
  colorOverlayColor: string;
  colorOverlayOpacity: number;
  colorOverlayBlendMode: ColorOverlayBlendMode;
  effectPreset: EffectPreset;
  effectIntensity: number;
  pauseWhenHidden: boolean;
  respectReducedMotion: boolean;
  profiles: VeilProfile[];
  wallpaperRules: WallpaperRule[];
  opacityExclusions: OpacityExclusionRule[];
}

export type VeilAppearance = Omit<VeilProfile, "id" | "name">;

export const DEFAULT_SETTINGS: Readonly<VeilSettings> = Object.freeze({
  enabled: true,
  wallpaperPath: "",
  displayMode: "cover",
  opacity: 15,
  paneOpacity: 70,
  paneContentOpacity: 100,
  vignetteMode: "off",
  vignetteIntensity: 40,
  vignetteRadius: 55,
  blurEnabled: false,
  blurIntensity: 8,
  dimEnabled: false,
  dimIntensity: 30,
  colorOverlayEnabled: false,
  colorOverlayColor: "#7dd3fc",
  colorOverlayOpacity: 30,
  colorOverlayBlendMode: "color",
  effectPreset: "none",
  effectIntensity: 35,
  pauseWhenHidden: true,
  respectReducedMotion: true,
  profiles: [],
  wallpaperRules: [],
  opacityExclusions: [],
});

const APPEARANCE_KEYS = [
  "wallpaperPath",
  "displayMode",
  "opacity",
  "paneOpacity",
  "paneContentOpacity",
  "vignetteMode",
  "vignetteIntensity",
  "vignetteRadius",
  "blurEnabled",
  "blurIntensity",
  "dimEnabled",
  "dimIntensity",
  "colorOverlayEnabled",
  "colorOverlayColor",
  "colorOverlayOpacity",
  "colorOverlayBlendMode",
  "effectPreset",
  "effectIntensity",
  "pauseWhenHidden",
  "respectReducedMotion",
] as const satisfies readonly (keyof VeilAppearance)[];

type PathNormalizer = (path: string) => string;

function fallbackNormalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
}

export function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === null || value === "" || typeof value === "boolean") return fallback;
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.round(Math.max(minimum, Math.min(maximum, number)))
    : fallback;
}

export function normalizeWallpaperPath(
  value: unknown,
  normalize: PathNormalizer = fallbackNormalizePath,
): string {
  let path = typeof value === "string" ? value.trim() : "";
  const wikiLink = path.match(/^!?\[\[([\s\S]*)\]\]$/);
  if (wikiLink) path = wikiLink[1].split("|")[0].trim();
  return normalize(path.replaceAll("\\", "/").replace(/^\.\//, ""));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDisplayMode(value: unknown): value is DisplayMode {
  return typeof value === "string" && Object.keys(DISPLAY_MODES).includes(value);
}

function isMatchType(value: unknown): value is MatchType {
  return typeof value === "string" && Object.keys(MATCH_TYPES).includes(value);
}

function isColorOverlayBlendMode(value: unknown): value is ColorOverlayBlendMode {
  return typeof value === "string" && Object.keys(COLOR_OVERLAY_BLEND_MODES).includes(value);
}

function isEffectPreset(value: unknown): value is EffectPreset {
  return typeof value === "string" && Object.keys(EFFECT_PRESETS).includes(value);
}

function colorValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const color = value.trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function stringValue(value: unknown, fallback = "", maximumLength = 500): string {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : fallback;
}

function normalizeMatchValue(
  value: unknown,
  matchType: MatchType,
  normalize: PathNormalizer,
): string {
  const raw = stringValue(value);
  if (matchType === "tag") return raw.replace(/^#+/, "");
  if (matchType === "note") return raw.replace(/\.md$/i, "");
  return normalizeWallpaperPath(raw, normalize).replace(/\/$/, "");
}

function uniqueId(value: unknown, prefix: string, index: number, usedIds: Set<string>): string {
  const fallback = `${prefix}-${index + 1}`;
  const base = stringValue(value, fallback, 80) || fallback;
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function normalizeAppearance(
  value: Record<string, unknown>,
  fallback: VeilAppearance,
  normalize: PathNormalizer,
): VeilAppearance {
  const appearance: VeilAppearance = { ...fallback };

  if (typeof value.wallpaperPath === "string") {
    appearance.wallpaperPath = normalizeWallpaperPath(value.wallpaperPath, normalize);
  }
  if (isDisplayMode(value.displayMode)) appearance.displayMode = value.displayMode;
  if (
    value.vignetteMode === "off" ||
    value.vignetteMode === "ellipse" ||
    value.vignetteMode === "circle"
  ) {
    appearance.vignetteMode = value.vignetteMode;
  }
  if (isColorOverlayBlendMode(value.colorOverlayBlendMode)) {
    appearance.colorOverlayBlendMode = value.colorOverlayBlendMode;
  }
  if (isEffectPreset(value.effectPreset)) appearance.effectPreset = value.effectPreset;
  appearance.colorOverlayColor = colorValue(
    value.colorOverlayColor,
    fallback.colorOverlayColor,
  );

  for (const key of [
    "blurEnabled",
    "dimEnabled",
    "colorOverlayEnabled",
    "pauseWhenHidden",
    "respectReducedMotion",
  ] as const) {
    if (typeof value[key] === "boolean") appearance[key] = value[key];
  }

  for (const key of [
    "opacity",
    "paneOpacity",
    "paneContentOpacity",
    "vignetteIntensity",
    "vignetteRadius",
    "dimIntensity",
    "colorOverlayOpacity",
    "effectIntensity",
  ] as const) {
    appearance[key] = boundedNumber(value[key], fallback[key], 0, 100);
  }
  appearance.blurIntensity = boundedNumber(value.blurIntensity, fallback.blurIntensity, 0, 40);
  return appearance;
}

export function copyAppearance(source: VeilAppearance): VeilAppearance {
  const appearance = {} as VeilAppearance;
  for (const key of APPEARANCE_KEYS) {
    // The key list is constrained to VeilAppearance above.
    (appearance as Record<keyof VeilAppearance, VeilAppearance[keyof VeilAppearance]>)[key] =
      source[key];
  }
  return appearance;
}

export function appearanceFromSettings(settings: VeilSettings): VeilAppearance {
  return copyAppearance(settings);
}

function defaultAppearance(): VeilAppearance {
  const settings = DEFAULT_SETTINGS as VeilSettings;
  return appearanceFromSettings(settings);
}

function normalizeProfiles(value: unknown, normalize: PathNormalizer): VeilProfile[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  const fallback = defaultAppearance();
  return value.slice(0, 64).flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const id = uniqueId(candidate.id, "profile", index, usedIds);
    const appearance = normalizeAppearance(candidate, fallback, normalize);
    return [{
      id,
      name: stringValue(candidate.name, `Scene ${index + 1}`, 80) || `Scene ${index + 1}`,
      ...appearance,
    }];
  });
}

function normalizeWallpaperRules(value: unknown, normalize: PathNormalizer): WallpaperRule[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  return value.slice(0, 96).flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const matchType = isMatchType(candidate.matchType) ? candidate.matchType : "path";
    return [{
      id: uniqueId(candidate.id, "wallpaper", index, usedIds),
      enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : false,
      matchType,
      matchValue: normalizeMatchValue(candidate.matchValue, matchType, normalize),
      profileId: stringValue(candidate.profileId, "", 80),
      wallpaperPath: normalizeWallpaperPath(candidate.wallpaperPath, normalize),
    }];
  });
}

function normalizeOpacityExclusions(
  value: unknown,
  normalize: PathNormalizer,
): OpacityExclusionRule[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  return value.slice(0, 96).flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const matchType = isMatchType(candidate.matchType) ? candidate.matchType : "path";
    return [{
      id: uniqueId(candidate.id, "opacity", index, usedIds),
      enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : false,
      matchType,
      matchValue: normalizeMatchValue(candidate.matchValue, matchType, normalize),
      excludePaneSurface:
        typeof candidate.excludePaneSurface === "boolean" ? candidate.excludePaneSurface : true,
      excludePaneContent:
        typeof candidate.excludePaneContent === "boolean" ? candidate.excludePaneContent : true,
    }];
  });
}

export function normalizeSettings(
  value: unknown,
  normalize: PathNormalizer = fallbackNormalizePath,
): VeilSettings {
  const stored = isRecord(value) ? value : {};
  const fallbackAppearance = defaultAppearance();
  const normalizedAppearance = normalizeAppearance(stored, fallbackAppearance, normalize);
  const settings: VeilSettings = {
    enabled: typeof stored.enabled === "boolean" ? stored.enabled : DEFAULT_SETTINGS.enabled,
    ...normalizedAppearance,
    profiles: normalizeProfiles(stored.profiles, normalize),
    wallpaperRules: normalizeWallpaperRules(stored.wallpaperRules, normalize),
    opacityExclusions: normalizeOpacityExclusions(stored.opacityExclusions, normalize),
  };

  const profileIds = new Set(settings.profiles.map((profile) => profile.id));
  for (const rule of settings.wallpaperRules) {
    if (rule.profileId && !profileIds.has(rule.profileId)) rule.profileId = "";
  }
  return settings;
}

function nextRuleId(prefix: string, existingIds: string[]): string {
  const usedIds = new Set(existingIds);
  let id = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  while (usedIds.has(id)) id = `${id}-new`;
  return id;
}

export function createWallpaperRule(existing: WallpaperRule[]): WallpaperRule {
  return {
    id: nextRuleId("wallpaper", existing.map((rule) => rule.id)),
    enabled: false,
    matchType: "path",
    matchValue: "",
    profileId: "",
    wallpaperPath: "",
  };
}

export function createOpacityExclusionRule(
  existing: OpacityExclusionRule[],
): OpacityExclusionRule {
  return {
    id: nextRuleId("opacity", existing.map((rule) => rule.id)),
    enabled: false,
    matchType: "path",
    matchValue: "",
    excludePaneSurface: true,
    excludePaneContent: true,
  };
}

export function createProfile(
  existing: VeilProfile[],
  source: VeilSettings,
): VeilProfile {
  return {
    id: nextRuleId("profile", existing.map((profile) => profile.id)),
    name: `Scene ${existing.length + 1}`,
    ...appearanceFromSettings(source),
  };
}

export function mediaKind(file: { extension?: unknown } | null): MediaKind {
  const extension = typeof file?.extension === "string" ? file.extension.toLowerCase() : "";
  if (["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) {
    return "image";
  }
  if (["mp4", "webm", "ogv", "m4v", "mov"].includes(extension)) return "video";
  return "";
}
