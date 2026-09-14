import { normalizePath } from "obsidian";
import type { VeilSettings } from "./settings";
import {
  normalizeWallpaperLibraryState,
  rememberRecentWallpaper,
  toggleFavoriteWallpaper,
  type WallpaperLibraryState,
} from "./wallpaper-library-state";

export class WallpaperLibraryRuntime {
  private state: WallpaperLibraryState = { favorites: [], recent: [] };

  load(value: unknown): void {
    this.state = normalizeWallpaperLibraryState(value, normalizePath);
  }

  getState(): WallpaperLibraryState {
    return this.state;
  }

  toggleFavorite(path: string): void {
    this.state = toggleFavoriteWallpaper(this.state, path, normalizePath);
  }

  rememberSettingsChanges(previous: VeilSettings, next: VeilSettings): void {
    const paths: string[] = [];
    if (next.wallpaperPath && next.wallpaperPath !== previous.wallpaperPath) {
      paths.push(next.wallpaperPath);
    }

    const previousProfiles = new Map(previous.profiles.map((profile) => [profile.id, profile.wallpaperPath]));
    for (const profile of next.profiles) {
      if (profile.wallpaperPath && previousProfiles.get(profile.id) !== profile.wallpaperPath) {
        paths.push(profile.wallpaperPath);
      }
    }

    const previousRules = new Map(previous.wallpaperRules.map((rule) => [rule.id, rule.wallpaperPath]));
    for (const rule of next.wallpaperRules) {
      if (rule.wallpaperPath && previousRules.get(rule.id) !== rule.wallpaperPath) {
        paths.push(rule.wallpaperPath);
      }
    }

    for (const path of paths) {
      this.state = rememberRecentWallpaper(this.state, path, normalizePath);
    }
  }

  rewritePaths(rewrite: (path: string) => string): boolean {
    const next = normalizeWallpaperLibraryState({
      favorites: this.state.favorites.map(rewrite),
      recent: this.state.recent.map(rewrite),
    }, normalizePath);
    if (samePathLists(next, this.state)) return false;
    this.state = next;
    return true;
  }

  prune(path: string): boolean {
    const prefix = `${path}/`;
    const next = normalizeWallpaperLibraryState({
      favorites: this.state.favorites.filter(
        (candidate) => candidate !== path && !candidate.startsWith(prefix),
      ),
      recent: this.state.recent.filter(
        (candidate) => candidate !== path && !candidate.startsWith(prefix),
      ),
    }, normalizePath);
    if (samePathLists(next, this.state)) return false;
    this.state = next;
    return true;
  }
}

function samePathLists(left: WallpaperLibraryState, right: WallpaperLibraryState): boolean {
  return left.favorites.join("\n") === right.favorites.join("\n")
    && left.recent.join("\n") === right.recent.join("\n");
}
