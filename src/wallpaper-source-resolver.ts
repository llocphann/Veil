import { TFile, type App } from "obsidian";
import type { NoteContext } from "./context-rules";
import type { ResolvedWallpaper } from "./profile-resolver";
import { runtimeWorkProfiler } from "./runtime-work-profiler";
import { SceneRuntime } from "./scene-runtime";
import {
  mediaKind,
  type MediaKind,
  type VeilAppearance,
  type VeilSettings,
} from "./settings";
import { wallpaperMediaIdentityKey } from "./wallpaper-media-identity";
import {
  WallpaperPoolRuntime,
  type WallpaperPoolVaultEvent,
} from "./wallpaper-pool-runtime";

export interface WallpaperSource {
  path: string;
  url: string;
  kind: Exclude<MediaKind, "">;
  label: string;
  key: string;
  contextLabel: string;
  appearance: VeilAppearance;
}

export interface WallpaperSourceResolution {
  source: WallpaperSource | null;
  resolved: ResolvedWallpaper;
  statusMessage: string;
  statusTone: "info" | "error";
}

interface CachedMediaLookup {
  path: string;
  revision: number;
  invalidPath: boolean;
  file: TFile | null;
  modifiedAt: number;
  size: number;
  kind: MediaKind;
  url: string;
  label: string;
  key: string;
}

const MAX_SOURCE_LOOKUPS = 128;

export class WallpaperSourceResolver {
  private readonly mediaLookupCache = new Map<string, CachedMediaLookup>();

  constructor(
    private readonly app: App,
    private readonly scenes: SceneRuntime,
    private readonly pools: WallpaperPoolRuntime,
    private readonly getSettings: () => VeilSettings,
  ) {
    this.pools.onVaultEvent((event, path, oldPath, isFolder) => {
      this.invalidateVaultEvent(event, path, oldPath, isFolder);
    });
  }

  resolve(context: NoteContext | null, sourceRevision: number): WallpaperSourceResolution {
    const settings = this.getSettings();
    const resolved = this.scenes.resolve(settings, context);
    const contextKey = this.contextKey(resolved.rule?.id || "", resolved.profile?.id || "");
    const poolActive = (!resolved.rule || Boolean(resolved.profile))
      && resolved.appearance.wallpaperPoolEnabled;
    const path = poolActive
      ? this.pools.pathForAppearance(resolved.appearance, contextKey)
      : resolved.path;
    const lookup = this.mediaLookup(path, sourceRevision);
    const file = lookup.file;
    const kind = lookup.kind;
    const manualProfileId = this.scenes.getManualProfileId();
    const contextLabel = manualProfileId && resolved.profile
      ? `Manual scene “${resolved.profile.name}”${poolActive ? " · pool" : ""}`
      : resolved.profile
        ? `Scene “${resolved.profile.name}”${poolActive ? " · pool" : ""}`
        : resolved.rule
          ? `Rule ${resolved.rule.matchType}: ${resolved.rule.matchValue}`
          : `Default appearance${poolActive ? " · pool" : ""}`;

    if (!path || !(file instanceof TFile) || !kind) {
      const rulePrefix = resolved.rule ? `${contextLabel}: ` : "";
      const statusMessage = !path
        ? resolved.rule
          ? resolved.profile
            ? `${rulePrefix}choose a wallpaper file for this scene.`
            : `${rulePrefix}choose a wallpaper file for this rule.`
          : manualProfileId && resolved.profile
            ? `Manual scene “${resolved.profile.name}”: choose a wallpaper file for this scene.`
            : "Choose a wallpaper file to begin."
        : lookup.invalidPath
          ? "Use a vault-relative path, not a URL or a path outside the vault."
          : !(file instanceof TFile)
            ? `${rulePrefix}file not found in this vault: ${path}`
            : `${rulePrefix}unsupported wallpaper format: ${file.extension}`;
      return {
        source: null,
        resolved,
        statusMessage,
        statusTone: path || resolved.rule ? "error" : "info",
      };
    }

    return {
      source: {
        path: file.path,
        url: lookup.url,
        kind,
        label: lookup.label,
        key: lookup.key,
        contextLabel,
        appearance: resolved.appearance,
      },
      resolved,
      statusMessage: "",
      statusTone: "info",
    };
  }

  private mediaLookup(path: string, sourceRevision: number): CachedMediaLookup {
    const cached = this.mediaLookupCache.get(path);
    if (
      cached
      && cached.revision === sourceRevision
      && this.cachedLookupStillCurrent(cached)
    ) {
      return cached;
    }
    if (__VEIL_DEV__) runtimeWorkProfiler.record("sourceLookup");

    const invalidPath = /(^\/|^[a-z][a-z0-9+.-]*:|(^|\/)\.\.(\/|$))/i.test(path);
    const abstractFile = invalidPath || !path ? null : this.app.vault.getAbstractFileByPath(path);
    const file = abstractFile instanceof TFile ? abstractFile : null;
    const kind = file ? mediaKind(file) : "";
    const url = file && kind ? this.app.vault.getResourcePath(file) : "";
    const lookup: CachedMediaLookup = {
      path,
      revision: sourceRevision,
      invalidPath,
      file,
      modifiedAt: file?.stat.mtime || 0,
      size: file?.stat.size || 0,
      kind,
      url,
      label: file && kind
        ? kind === "video"
          ? "Video"
          : file.extension.toLowerCase() === "gif"
            ? "Animated GIF"
            : "Image"
        : "",
      key: file && kind
        ? wallpaperMediaIdentityKey({
            path: file.path,
            url,
            modifiedAt: file.stat.mtime,
            size: file.stat.size,
            revision: sourceRevision,
          })
        : "",
    };
    this.rememberLookup(path, lookup);
    return lookup;
  }

  private cachedLookupStillCurrent(cached: CachedMediaLookup): boolean {
    if (!cached.file) return true;
    return cached.file.path === cached.path
      && cached.file.stat.mtime === cached.modifiedAt
      && cached.file.stat.size === cached.size;
  }

  private rememberLookup(path: string, lookup: CachedMediaLookup): void {
    if (!this.mediaLookupCache.has(path) && this.mediaLookupCache.size >= MAX_SOURCE_LOOKUPS) {
      const oldest = this.mediaLookupCache.keys().next();
      if (!oldest.done) this.mediaLookupCache.delete(oldest.value);
    }
    this.mediaLookupCache.delete(path);
    this.mediaLookupCache.set(path, lookup);
  }

  private invalidateVaultEvent(
    _event: WallpaperPoolVaultEvent,
    path: string,
    oldPath: string,
    isFolder: boolean,
  ): void {
    if (!isFolder) {
      this.mediaLookupCache.delete(path);
      if (oldPath) this.mediaLookupCache.delete(oldPath);
      return;
    }

    for (const cachedPath of Array.from(this.mediaLookupCache.keys())) {
      if (
        this.pathWithin(cachedPath, path)
        || (oldPath && this.pathWithin(cachedPath, oldPath))
      ) {
        this.mediaLookupCache.delete(cachedPath);
      }
    }
  }

  private pathWithin(candidate: string, root: string): boolean {
    if (!root) return false;
    return candidate === root || candidate.startsWith(`${root}/`);
  }

  private contextKey(ruleId: string, profileId: string): string {
    if (profileId) return `profile:${profileId}`;
    if (ruleId) return `rule:${ruleId}`;
    return "default";
  }
}