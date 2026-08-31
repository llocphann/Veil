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
  return settings;
}

export function mediaKind(file: { extension?: unknown } | null): MediaKind {
  const extension = typeof file?.extension === "string" ? file.extension.toLowerCase() : "";
  if (["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) {
    return "image";
  }
  if (["mp4", "webm", "ogv", "m4v", "mov"].includes(extension)) return "video";
  return "";
}
