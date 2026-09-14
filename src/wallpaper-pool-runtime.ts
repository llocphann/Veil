import type { App } from "obsidian";
import { invalidatePoolCandidatesForVaultEvent } from "./pool-cache-invalidation";
import { mediaKind, type VeilAppearance, type VeilSettings } from "./settings";
import {
  rewriteWallpaperPoolSelectionsForRename,
  staleWallpaperPoolCandidateCacheKeys,
  wallpaperPoolChangeIntervalForContext,
  wallpaperPoolSelectionConfigurationChanges,
} from "./wallpaper-pool-config";

export type WallpaperPoolVaultEvent = "create" | "delete" | "rename";
type VaultEventListener = (
  event: WallpaperPoolVaultEvent,
  path: string,
  oldPath: string,
  isFolder: boolean,
) => void;

interface PoolRotationSchedule {
  contextKey: string;
  intervalMinutes: number;
  dueAt: number;
}

export class WallpaperPoolRuntime {
  private readonly candidates = new Map<string, string[]>();
  private readonly selections = new Map<string, string>();
  private readonly previousSelections = new Map<string, string>();
  private readonly rotationSchedules = new Map<string, PoolRotationSchedule>();
  private readonly vaultEventListeners = new Set<VaultEventListener>();

  constructor(private readonly app: App) {}

  clear(): void {
    this.candidates.clear();
    this.selections.clear();
    this.previousSelections.clear();
    this.rotationSchedules.clear();
    this.vaultEventListeners.clear();
  }

  onVaultEvent(listener: VaultEventListener): () => void {
    this.vaultEventListeners.add(listener);
    return () => this.vaultEventListeners.delete(listener);
  }

  reconcileSettings(
    previous: VeilSettings,
    next: VeilSettings,
    preservedContexts: readonly string[] = [],
  ): void {
    const changedContexts = wallpaperPoolSelectionConfigurationChanges(previous, next);
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
      for (const key of Array.from(this.rotationSchedules.keys())) {
        if (key.startsWith(prefix)) this.rotationSchedules.delete(key);
      }
    }

    const now = Date.now();
    for (const [selectionKey, schedule] of this.rotationSchedules) {
      const nextInterval = wallpaperPoolChangeIntervalForContext(next, schedule.contextKey);
      if (nextInterval <= 0) {
        this.rotationSchedules.delete(selectionKey);
        continue;
      }
      if (nextInterval !== schedule.intervalMinutes) {
        this.rotationSchedules.set(selectionKey, {
          contextKey: schedule.contextKey,
          intervalMinutes: nextInterval,
          dueAt: now + nextInterval * 60_000,
        });
      }
    }
  }

  invalidateVaultEvent(
    event: WallpaperPoolVaultEvent,
    path: string,
    oldPath = "",
    isFolder = false,
  ): void {
    for (const listener of this.vaultEventListeners) {
      listener(event, path, oldPath, isFolder);
    }
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
    this.rotationSchedules.delete(selectionKey);
  }

  nextRotationBoundary(): number | null {
    let boundary: number | null = null;
    for (const schedule of this.rotationSchedules.values()) {
      if (boundary === null || schedule.dueAt < boundary) boundary = schedule.dueAt;
    }
    return boundary;
  }

  consumeDueRotations(now = Date.now()): string[] {
    const contexts = new Set<string>();
    for (const [selectionKey, schedule] of Array.from(this.rotationSchedules.entries())) {
      if (schedule.dueAt > now) continue;
      const current = this.selections.get(selectionKey);
      if (current) this.previousSelections.set(selectionKey, current);
      this.selections.delete(selectionKey);
      this.rotationSchedules.delete(selectionKey);
      contexts.add(schedule.contextKey);
    }
    return Array.from(contexts).sort((left, right) => left.localeCompare(right));
  }

  pathForAppearance(appearance: VeilAppearance, contextKey: string): string {
    const folder = appearance.wallpaperPoolFolder;
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

    const selectionKey = this.selectionKey(appearance, contextKey);
    if (candidates.length === 0) {
      this.rotationSchedules.delete(selectionKey);
      return appearance.wallpaperPath;
    }

    const current = this.selections.get(selectionKey);
    if (current && candidates.includes(current)) {
      this.ensureRotationSchedule(
        selectionKey,
        contextKey,
        appearance.wallpaperPoolChangeInterval,
        candidates.length,
      );
      return current;
    }

    const previous = this.previousSelections.get(selectionKey);
    const choices = previous && candidates.length > 1
      ? candidates.filter((candidate) => candidate !== previous)
      : candidates;
    const selected = choices[Math.floor(Math.random() * choices.length)] || appearance.wallpaperPath;
    this.selections.set(selectionKey, selected);
    this.ensureRotationSchedule(
      selectionKey,
      contextKey,
      appearance.wallpaperPoolChangeInterval,
      candidates.length,
      true,
    );
    return selected;
  }

  private ensureRotationSchedule(
    selectionKey: string,
    contextKey: string,
    intervalMinutes: number,
    candidateCount: number,
    reset = false,
  ): void {
    if (intervalMinutes <= 0 || candidateCount <= 1) {
      this.rotationSchedules.delete(selectionKey);
      return;
    }
    const current = this.rotationSchedules.get(selectionKey);
    if (!reset && current?.intervalMinutes === intervalMinutes) return;
    this.rotationSchedules.set(selectionKey, {
      contextKey,
      intervalMinutes,
      dueAt: Date.now() + intervalMinutes * 60_000,
    });
  }

  private selectionKey(appearance: VeilAppearance, contextKey: string): string {
    return `${contextKey}|${appearance.wallpaperPoolFolder}|${
      appearance.wallpaperPoolIncludeSubfolders ? "recursive" : "direct"
    }`;
  }
}
