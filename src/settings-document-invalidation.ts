import {
  matchingOpacityExclusions,
  type NoteContext,
} from "./context-rules";
import type { ResolvedWallpaper } from "./profile-resolver";
import type { VeilSettings } from "./settings";
import { wallpaperRenderAppearanceSignature } from "./wallpaper-document-signature";

function resolvedSourceIdentity(resolved: ResolvedWallpaper): object {
  const poolActive = (!resolved.rule || Boolean(resolved.profile))
    && resolved.appearance.wallpaperPoolEnabled;
  return {
    path: resolved.path,
    poolActive,
    poolIncludeSubfolders: poolActive
      ? resolved.appearance.wallpaperPoolIncludeSubfolders
      : false,
  };
}

function resolvedStatusIdentity(resolved: ResolvedWallpaper): object {
  return {
    rule: resolved.rule
      ? {
        id: resolved.rule.id,
        matchType: resolved.rule.matchType,
        matchValue: resolved.profile ? "" : resolved.rule.matchValue,
      }
      : null,
    profile: resolved.profile
      ? { id: resolved.profile.id, name: resolved.profile.name }
      : null,
  };
}

export function resolvedDocumentSettingsSignature(
  settings: VeilSettings,
  context: NoteContext | null,
  resolved: ResolvedWallpaper,
): string {
  return JSON.stringify({
    enabled: settings.enabled,
    source: resolvedSourceIdentity(resolved),
    status: resolvedStatusIdentity(resolved),
    render: wallpaperRenderAppearanceSignature(resolved.appearance),
    opacityExclusions: matchingOpacityExclusions(settings.opacityExclusions, context),
  });
}

export function resolvedDocumentSettingsChanged(
  previous: VeilSettings,
  next: VeilSettings,
  context: NoteContext | null,
  previousResolved: ResolvedWallpaper,
  nextResolved: ResolvedWallpaper,
): boolean {
  return resolvedDocumentSettingsSignature(previous, context, previousResolved)
    !== resolvedDocumentSettingsSignature(next, context, nextResolved);
}
