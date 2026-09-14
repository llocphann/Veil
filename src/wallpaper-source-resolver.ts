import { TFile, type App } from "obsidian";
import type { NoteContext } from "./context-rules";
import type { ResolvedWallpaper } from "./profile-resolver";
import { SceneRuntime } from "./scene-runtime";
import {
  mediaKind,
  type MediaKind,
  type VeilAppearance,
  type VeilSettings,
} from "./settings";
import { WallpaperPoolRuntime } from "./wallpaper-pool-runtime";

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

export class WallpaperSourceResolver {
  constructor(
    private readonly app: App,
    private readonly scenes: SceneRuntime,
    private readonly pools: WallpaperPoolRuntime,
    private readonly getSettings: () => VeilSettings,
  ) {}

  resolve(context: NoteContext | null, sourceRevision: number): WallpaperSourceResolution {
    const settings = this.getSettings();
    const resolved = this.scenes.resolve(settings, context);
    const contextKey = this.contextKey(resolved.rule?.id || "", resolved.profile?.id || "");
    const poolActive = (!resolved.rule || Boolean(resolved.profile))
      && resolved.appearance.wallpaperPoolEnabled;
    const path = poolActive
      ? this.pools.pathForAppearance(resolved.appearance, contextKey)
      : resolved.path;
    const invalidPath = /(^\/|^[a-z][a-z0-9+.-]*:|(^|\/)\.\.(\/|$))/i.test(path);
    const file = invalidPath ? null : this.app.vault.getAbstractFileByPath(path);
    const kind = file instanceof TFile ? mediaKind(file) : "";
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
        : invalidPath
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

    const url = this.app.vault.getResourcePath(file);
    return {
      source: {
        path: file.path,
        url,
        kind,
        label:
          kind === "video"
            ? "Video"
            : file.extension.toLowerCase() === "gif"
              ? "Animated GIF"
              : "Image",
        key: [
          file.path,
          url,
          file.stat.mtime,
          file.stat.size,
          contextKey,
          manualProfileId ? `manual:${manualProfileId}` : "automatic",
          sourceRevision,
        ].join("|"),
        contextLabel,
        appearance: resolved.appearance,
      },
      resolved,
      statusMessage: "",
      statusTone: "info",
    };
  }

  private contextKey(ruleId: string, profileId: string): string {
    if (profileId) return `profile:${profileId}`;
    if (ruleId) return `rule:${ruleId}`;
    return "default";
  }
}
