import type { ContextRule, OpacityExclusionRule, WallpaperRule } from "./settings";

export interface NoteContext {
  path: string;
  name: string;
  basename: string;
  tags: string[];
  properties: Record<string, unknown>;
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

function comparablePropertyValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((candidate) => comparablePropertyValue(candidate));
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [comparable(String(value))];
  }
  return [];
}

function propertyMatches(ruleValue: string, properties: Record<string, unknown>): boolean {
  const separator = ruleValue.indexOf("=");
  const key = comparable(separator >= 0 ? ruleValue.slice(0, separator) : ruleValue);
  if (!key) return false;

  const propertyKey = Object.keys(properties).find((candidate) => comparable(candidate) === key);
  if (!propertyKey) return false;
  if (separator < 0) return true;

  const expected = comparable(ruleValue.slice(separator + 1));
  return comparablePropertyValue(properties[propertyKey]).includes(expected);
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

  if (rule.matchType === "property") {
    return propertyMatches(rule.matchValue, context.properties);
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
