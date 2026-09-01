import type { ContextRule, OpacityExclusionRule, WallpaperRule } from "./settings";

export interface NoteContext {
  path: string;
  name: string;
  basename: string;
  tags: string[];
  properties: Record<string, unknown>;
  theme?: "light" | "dark";
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

function currentTheme(context: NoteContext | null): "light" | "dark" | "" {
  if (context?.theme === "light" || context?.theme === "dark") return context.theme;
  if (typeof document === "undefined") return "";
  if (document.body?.classList.contains("theme-dark")) return "dark";
  if (document.body?.classList.contains("theme-light")) return "light";
  return "";
}

function propertyParts(ruleValue: string): { key: string; expected: string | null } {
  const separator = ruleValue.indexOf("=");
  return {
    key: comparable(separator >= 0 ? ruleValue.slice(0, separator) : ruleValue),
    expected: separator >= 0 ? comparable(ruleValue.slice(separator + 1)) : null,
  };
}

function systemContextMatches(ruleValue: string, context: NoteContext | null): boolean | null {
  const { key, expected } = propertyParts(ruleValue);
  if (key !== "@theme") return null;
  if (!expected || (expected !== "light" && expected !== "dark")) return false;
  return currentTheme(context) === expected;
}

function propertyMatches(ruleValue: string, properties: Record<string, unknown>): boolean {
  const { key, expected } = propertyParts(ruleValue);
  if (!key || key.startsWith("@")) return false;

  const propertyKey = Object.keys(properties).find((candidate) => comparable(candidate) === key);
  if (!propertyKey) return false;
  if (expected === null) return true;

  return comparablePropertyValue(properties[propertyKey]).includes(expected);
}

function isSystemFallbackRule(rule: ContextRule): boolean {
  if (rule.matchType !== "property") return false;
  return propertyParts(rule.matchValue).key.startsWith("@");
}

export function contextMatches(rule: ContextRule, context: NoteContext | null): boolean {
  if (!rule.enabled || !rule.matchValue.trim()) return false;

  if (rule.matchType === "property") {
    const systemMatch = systemContextMatches(rule.matchValue, context);
    if (systemMatch !== null) return systemMatch;
    return context ? propertyMatches(rule.matchValue, context.properties) : false;
  }

  if (!context) return false;

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
  const contextual = rules.find(
    (rule) => !isSystemFallbackRule(rule) && contextMatches(rule, context),
  );
  if (contextual) return contextual;
  return rules.find((rule) => isSystemFallbackRule(rule) && contextMatches(rule, context)) || null;
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
