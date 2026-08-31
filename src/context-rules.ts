import type { ContextRule, OpacityExclusionRule, WallpaperRule } from "./settings";

export interface NoteContext {
  path: string;
  name: string;
  basename: string;
  tags: string[];
}

function comparable(value: string): string {
  return value.trim().toLowerCase();
}

function normalizedRulePath(value: string): string {
  return comparable(
    value.replaceAll("\\", "/").replace(/\/{2,}/g, "/").replace(/^\.\//, "").replace(/\/$/, ""),
  );
}

function normalizedTag(value: string): string {
  return comparable(value).replace(/^#+/, "");
}

export function contextMatches(rule: ContextRule, context: NoteContext | null): boolean {
  if (!rule.enabled || !context || !rule.matchValue.trim()) return false;

  if (rule.matchType === "note") {
    const target = comparable(rule.matchValue).replace(/\.md$/i, "");
    return comparable(context.basename) === target
      || comparable(context.name).replace(/\.md$/i, "") === target;
  }

  if (rule.matchType === "path") {
    return normalizedRulePath(context.path) === normalizedRulePath(rule.matchValue);
  }

  if (rule.matchType === "folder") {
    const folder = normalizedRulePath(rule.matchValue);
    const path = normalizedRulePath(context.path);
    return Boolean(folder) && path.startsWith(`${folder}/`);
  }

  const targetTag = normalizedTag(rule.matchValue);
  return context.tags.some((tag) => {
    const candidate = normalizedTag(tag);
    return candidate === targetTag || candidate.startsWith(`${targetTag}/`);
  });
}

export function matchingWallpaperRule(
  rules: WallpaperRule[],
  context: NoteContext | null,
): WallpaperRule | null {
  return rules.find((rule) => contextMatches(rule, context)) || null;
}

export interface OpacityExclusions {
  paneSurface: boolean;
  paneContent: boolean;
}

export function matchingOpacityExclusions(
  rules: OpacityExclusionRule[],
  context: NoteContext | null,
): OpacityExclusions {
  const matching = rules.filter((rule) => contextMatches(rule, context));
  return {
    paneSurface: matching.some((rule) => rule.excludePaneSurface),
    paneContent: matching.some((rule) => rule.excludePaneContent),
  };
}
