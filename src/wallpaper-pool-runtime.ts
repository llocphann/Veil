import type { App } from "obsidian";
import { invalidatePoolCandidatesForVaultEvent } from "./pool-cache-invalidation";
import { mediaKind, type VeilAppearance, type VeilSettings } from "./settings";
import {
  rewriteWallpaperPoolSelectionsForRename,
  staleWallpaperPoolCandidateCacheKeys,
  wallpaperPoolConfigurationChanges,
} from "./wallpaper-pool-config";

type PoolVaultEvent = "create" | "delete" | "rename";

export class WallpaperPoolRuntime {
  private readonly candidates = new Map<string, string[]>();
  private readonly selections = new Map<string, string>();
  private readonly previousSelections = new Map<string, string>();

  constructor(private readonly app: App) {}

  clear(): void {
    this.candidates.clear();
    this.selections.clear();
    this.previousSelections.clear();
  }

  reconcileSettings(
    previous: VeilSettings,
    next: VeilSettings,
    preservedContexts: readonly string[] = [],
  ): void {
    const changedContexts = wallpaperPoolConfigurationChanges(previous, next);
    const staleCandidateKeys = staleWallpaperPoolCandidateCacheKeys(previous, next);
    const preserved = new Set(preservedContexts);

    for (const key of staleCandidateKeys) this.candidates.delete(key);
    for (const contextKey of changedContexts) {
      if (preserved.has(contextKey)) continue;
      const prefix = `${contextKey}|`;
      for (const key of Array.from(this.selections.keys())) {
        if (key.startsWith(prefix)) this.selections.delete(key);
      }
      for (const key of Array.from(this.previousSelections.keys())) {
        if (key.startsWith(prefix)) this.previousSelections.delete(key);
      }
    }
  }

  invalidateVaultEvent(
    event: PoolVaultEvent,
    path: string,
    oldPath = "",
    isFolder = false,
  ): void {
    invalidatePoolCandidatesForVaultEvent(
      this.candidates,
      event,
      path,
      oldPath,
      isFolder,
    );
  }

  rewriteSelectionsForRename(
    previous: VeilSettings,
    next: VeilSettings,
    rewritePath: (path: string) => string,
  ): string[] {
    return Array.from(new Set([
      ...rewriteWallpaperPoolSelectionsForRename(
        this.selections,
        previous,
        next,
        rewritePath,
      ),
      ...rewriteWallpaperPoolSelectionsForRename(
        this.previousSelections,
        previous,
        next,
        rewritePath,
      ),
    ]));
  }

  shuffle(appearance: VeilAppearance, contextKey: string): void {
    const selectionKey = this.selectionKey(appearance, contextKey);
    const current = this.selections.get(selectionKey);
    if (current) this.previousSelections.set(selectionKey, current);
    this.selections.delete(selectionKey);
  }

  pathForAppearance(appearance: VeilAppearance, contextKey: string): string {
    const anchor = appearance.wallpaperPath;
    if (!anchor) return "";
    const separator = anchor.lastIndexOf("/");
    const folder = separator >= 0 ? anchor.slice(0, separator) : "";
    const recursive = appearance.wallpaperPoolIncludeSubfolders;
    const candidateKey = `${folder}|${recursive ? "recursive" : "direct"}`;
    let candidates = this.candidates.get(candidateKey);
    if (!candidates) {
      const prefix = folder ? `${folder}/` : "";
      candidates = this.app.vault.getFiles()
        .filter((file) => {
          if (!mediaKind(file)) return false;
          if (folder && !file.path.startsWith(prefix)) return false;
          const relative = folder ? file.path.slice(prefix.length) : file.path;
          return recursive || !relative.includes("/");
        })
        .map((file) => file.path)
        .sort((left, right) => left.localeCompare(right));
      this.candidates.set(candidateKey, candidates);
    }
    if (candidates.length === 0) return anchor;

    const selectionKey = this.selectionKey(appearance, contextKey);
    const current = this.selections.get(selectionKey);
    if (current && candidates.includes(current)) return current;

    const previous = this.previousSelections.get(selectionKey);
    const choices = previous && candidates.length > 1
      ? candidates.filter((candidate) => candidate !== previous)
      : candidates;
    const selected = choices[Math.floor(Math.random() * choices.length)] || anchor;
    this.selections.set(selectionKey, selected);
    return selected;
  }

  private selectionKey(appearance: VeilAppearance, contextKey: string): string {
    const anchor = appearance.wallpaperPath;
    const separator = anchor.lastIndexOf("/");
    const folder = separator >= 0 ? anchor.slice(0, separator) : "";
    return `${contextKey}|${folder}|${appearance.wallpaperPoolIncludeSubfolders ? "recursive" : "direct"}`;
  }
}
