import {
  matchingOpacityExclusions,
  type NoteContext,
} from "./context-rules";
import type { ResolvedWallpaper } from "./profile-resolver";
import type { VeilSettings } from "./settings";

function resolvedIdentity(resolved: ResolvedWallpaper): object {
  return {
    rule: resolved.rule
      ? {
        id: resolved.rule.id,
        enabled: resolved.rule.enabled,
        matchType: resolved.rule.matchType,
        matchValue: resolved.rule.matchValue,
        profileId: resolved.rule.profileId,
        wallpaperPath: resolved.rule.wallpaperPath,
      }
      : null,
    profile: resolved.profile
      ? { id: resolved.profile.id, name: resolved.profile.name }
      : null,
    path: resolved.path,
    appearance: resolved.appearance,
  };
}

export function resolvedDocumentSettingsSignature(
  settings: VeilSettings,
  context: NoteContext | null,
  resolved: ResolvedWallpaper,
): string {
  return JSON.stringify({
    enabled: settings.enabled,
    resolved: resolvedIdentity(resolved),
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
