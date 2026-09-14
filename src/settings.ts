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

export interface WallpaperRule extends ContextRule {
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
  pauseWhenHidden: boolean;
  respectReducedMotion: boolean;
  wallpaperRules: WallpaperRule[];
  opacityExclusions: OpacityExclusionRule[];
}

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
  pauseWhenHidden: true,
  respectReducedMotion: true,
  wallpaperRules: [],
  opacityExclusions: [],
});

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
  const settings: VeilSettings = { ...DEFAULT_SETTINGS };

  const booleanKeys = [
    "enabled",
    "blurEnabled",
    "dimEnabled",
    "pauseWhenHidden",
    "respectReducedMotion",
  ] as const;
  for (const key of booleanKeys) {
    if (typeof stored[key] === "boolean") settings[key] = stored[key];
  }

  if (typeof stored.wallpaperPath === "string") {
    settings.wallpaperPath = normalizeWallpaperPath(stored.wallpaperPath, normalize);
  }
  if (isDisplayMode(stored.displayMode)) {
    settings.displayMode = stored.displayMode;
  }
  if (
    stored.vignetteMode === "off" ||
    stored.vignetteMode === "ellipse" ||
    stored.vignetteMode === "circle"
  ) {
    settings.vignetteMode = stored.vignetteMode;
  }

  const percentageKeys = [
    "opacity",
    "paneOpacity",
    "paneContentOpacity",
    "vignetteIntensity",
    "vignetteRadius",
    "dimIntensity",
  ] as const;
  for (const key of percentageKeys) {
    settings[key] = boundedNumber(stored[key], DEFAULT_SETTINGS[key], 0, 100);
  }
  settings.blurIntensity = boundedNumber(
    stored.blurIntensity,
    DEFAULT_SETTINGS.blurIntensity,
    0,
    40,
  );
  settings.wallpaperRules = normalizeWallpaperRules(stored.wallpaperRules, normalize);
  settings.opacityExclusions = normalizeOpacityExclusions(stored.opacityExclusions, normalize);
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

export function mediaKind(file: { extension?: unknown } | null): MediaKind {
  const extension = typeof file?.extension === "string" ? file.extension.toLowerCase() : "";
  if (["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) {
    return "image";
  }
  if (["mp4", "webm", "ogv", "m4v", "mov"].includes(extension)) return "video";
  return "";
}
