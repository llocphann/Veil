import { normalizeWallpaperPath } from "./settings";

export const MAX_FAVORITE_WALLPAPERS = 128;
export const MAX_RECENT_WALLPAPERS = 24;

export interface WallpaperLibraryState {
  favorites: string[];
  recent: string[];
}

type PathNormalizer = (path: string) => string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePathList(
  value: unknown,
  limit: number,
  normalize?: PathNormalizer,
): string[] {
  if (!Array.isArray(value)) return [];
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    const path = normalizeWallpaperPath(candidate, normalize);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
    if (paths.length >= limit) break;
  }
  return paths;
}

export function normalizeWallpaperLibraryState(
  value: unknown,
  normalize?: PathNormalizer,
): WallpaperLibraryState {
  const stored = isRecord(value) ? value : {};
  return {
    favorites: normalizePathList(stored.favorites, MAX_FAVORITE_WALLPAPERS, normalize),
    recent: normalizePathList(stored.recent, MAX_RECENT_WALLPAPERS, normalize),
  };
}

export function rememberRecentWallpaper(
  state: WallpaperLibraryState,
  value: unknown,
  normalize?: PathNormalizer,
): WallpaperLibraryState {
  const path = normalizeWallpaperPath(value, normalize);
  if (!path) return state;
  return {
    favorites: [...state.favorites],
    recent: [path, ...state.recent.filter((candidate) => candidate !== path)]
      .slice(0, MAX_RECENT_WALLPAPERS),
  };
}

export function toggleFavoriteWallpaper(
  state: WallpaperLibraryState,
  value: unknown,
  normalize?: PathNormalizer,
): WallpaperLibraryState {
  const path = normalizeWallpaperPath(value, normalize);
  if (!path) return state;
  const exists = state.favorites.includes(path);
  return {
    favorites: exists
      ? state.favorites.filter((candidate) => candidate !== path)
      : [path, ...state.favorites].slice(0, MAX_FAVORITE_WALLPAPERS),
    recent: [...state.recent],
  };
}
