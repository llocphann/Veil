import type { NoteContext } from "./context-rules";
import { resolveWallpaper, type ResolvedWallpaper } from "./profile-resolver";
import {
  copyAppearance,
  type VeilProfile,
  type VeilSettings,
} from "./settings";

export type ManualSceneChange =
  | { kind: "unchanged" }
  | { kind: "missing" }
  | { kind: "cleared" }
  | { kind: "selected"; profile: VeilProfile };

interface CachedSceneResolution {
  revision: number;
  resolved: ResolvedWallpaper;
}

export class SceneRuntime {
  private manualProfileId = "";
  private resolutionRevision = 0;
  private readonly contextResolutionCache = new WeakMap<
    VeilSettings,
    WeakMap<NoteContext, CachedSceneResolution>
  >();
  private readonly workspaceResolutionCache = new WeakMap<
    VeilSettings,
    CachedSceneResolution
  >();

  getManualProfileId(): string {
    return this.manualProfileId;
  }

  invalidateResolution(): void {
    this.resolutionRevision += 1;
  }

  reconcileSettings(settings: VeilSettings): void {
    if (
      this.manualProfileId
      && !settings.profiles.some((profile) => profile.id === this.manualProfileId)
    ) {
      this.manualProfileId = "";
      this.invalidateResolution();
    }
  }

  setManualProfile(profileId: string, settings: VeilSettings): ManualSceneChange {
    if (profileId && !settings.profiles.some((profile) => profile.id === profileId)) {
      return { kind: "missing" };
    }
    if (this.manualProfileId === profileId) return { kind: "unchanged" };

    this.manualProfileId = profileId;
    this.invalidateResolution();
    if (!profileId) return { kind: "cleared" };
    const profile = settings.profiles.find((candidate) => candidate.id === profileId);
    return profile ? { kind: "selected", profile } : { kind: "missing" };
  }

  resolveSnapshot(settings: VeilSettings, context: NoteContext | null): ResolvedWallpaper {
    if (this.manualProfileId) {
      const profile = settings.profiles.find((candidate) => candidate.id === this.manualProfileId);
      if (profile) {
        return {
          rule: null,
          profile,
          path: profile.wallpaperPath,
          appearance: copyAppearance(profile),
        };
      }
    }
    return resolveWallpaper(settings, context);
  }

  resolve(settings: VeilSettings, context: NoteContext | null): ResolvedWallpaper {
    this.reconcileSettings(settings);
    const cached = context
      ? this.contextResolutionCache.get(settings)?.get(context)
      : this.workspaceResolutionCache.get(settings);
    if (cached?.revision === this.resolutionRevision) return cached.resolved;

    const resolved = this.resolveSnapshot(settings, context);
    const entry: CachedSceneResolution = {
      revision: this.resolutionRevision,
      resolved,
    };
    if (context) {
      let cache = this.contextResolutionCache.get(settings);
      if (!cache) {
        cache = new WeakMap<NoteContext, CachedSceneResolution>();
        this.contextResolutionCache.set(settings, cache);
      }
      cache.set(context, entry);
    } else {
      this.workspaceResolutionCache.set(settings, entry);
    }
    return resolved;
  }

  summary(settings: VeilSettings, context: NoteContext | null): string {
    const resolved = this.resolve(settings, context);
    const subject = context?.path || "Workspace";
    if (this.manualProfileId && resolved.profile) {
      const pool = resolved.appearance.wallpaperPoolEnabled ? " · pool" : "";
      return `${subject} → manual scene: ${resolved.profile.name}${pool}`;
    }
    if (resolved.profile) {
      const pool = resolved.appearance.wallpaperPoolEnabled ? " · pool" : "";
      return `${subject} → ${resolved.profile.name}${pool} (${resolved.rule?.matchType || "rule"})`;
    }
    if (resolved.rule) {
      return `${subject} → inline wallpaper rule (${resolved.rule.matchType}: ${resolved.rule.matchValue})`;
    }
    if (!context?.path) return "Workspace → default appearance";
    const pool = resolved.appearance.wallpaperPoolEnabled ? " · pool" : "";
    return `${context.path} → default appearance${pool}`;
  }
}
