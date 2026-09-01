import type { ContextRule, OpacityExclusionRule, WallpaperRule } from "./settings";

export interface NoteContext {
  path: string;
  name: string;
  basename: string;
  tags: string[];
  properties: Record<string, unknown>;
  theme?: "light" | "dark";
  now?: Date;
}

interface ClockRange {
  start: number;
  end: number;
}

const DAY_INDEX: Readonly<Record<string, number>> = Object.freeze({
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
});

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

function currentDate(context: NoteContext | null): Date {
  return context?.now instanceof Date && Number.isFinite(context.now.getTime())
    ? context.now
    : new Date();
}

function propertyParts(ruleValue: string): { key: string; expected: string | null } {
  const separator = ruleValue.indexOf("=");
  return {
    key: comparable(separator >= 0 ? ruleValue.slice(0, separator) : ruleValue),
    expected: separator >= 0 ? comparable(ruleValue.slice(separator + 1)) : null,
  };
}

function parseClock(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function parseClockRange(value: string): ClockRange | null {
  const separator = value.indexOf("-");
  if (separator < 0) return null;
  const start = parseClock(value.slice(0, separator));
  const end = parseClock(value.slice(separator + 1));
  return start === null || end === null ? null : { start, end };
}

function addDayRange(days: Set<number>, start: number, end: number): void {
  let day = start;
  for (let count = 0; count < 7; count += 1) {
    days.add(day);
    if (day === end) return;
    day = (day + 1) % 7;
  }
}

function parseDays(value: string): Set<number> | null {
  const source = comparable(value).replaceAll(" ", "");
  if (!source) return null;
  if (source === "*" || source === "daily" || source === "everyday") {
    return new Set([0, 1, 2, 3, 4, 5, 6]);
  }
  if (source === "weekday" || source === "weekdays") return new Set([1, 2, 3, 4, 5]);
  if (source === "weekend" || source === "weekends") return new Set([0, 6]);

  const days = new Set<number>();
  for (const part of source.split(",")) {
    if (!part) return null;
    const rangeSeparator = part.indexOf("-");
    if (rangeSeparator >= 0) {
      const start = DAY_INDEX[part.slice(0, rangeSeparator)];
      const end = DAY_INDEX[part.slice(rangeSeparator + 1)];
      if (start === undefined || end === undefined) return null;
      addDayRange(days, start, end);
      continue;
    }
    const day = DAY_INDEX[part];
    if (day === undefined) return null;
    days.add(day);
  }
  return days.size ? days : null;
}

function parseSchedule(value: string): { days: Set<number>; range: ClockRange } | null {
  const source = value.trim();
  const split = source.lastIndexOf(" ");
  if (split < 0) return null;
  const days = parseDays(source.slice(0, split));
  const range = parseClockRange(source.slice(split + 1));
  return days && range ? { days, range } : null;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function clockRangeMatches(range: ClockRange, minutes: number): boolean {
  if (range.start === range.end) return true;
  if (range.start < range.end) return minutes >= range.start && minutes < range.end;
  return minutes >= range.start || minutes < range.end;
}

function scheduleMatches(days: Set<number>, range: ClockRange, now: Date): boolean {
  const minutes = minutesOfDay(now);
  if (range.start === range.end) return days.has(now.getDay());
  if (range.start < range.end) {
    return days.has(now.getDay()) && minutes >= range.start && minutes < range.end;
  }
  if (minutes >= range.start) return days.has(now.getDay());
  if (minutes < range.end) return days.has((now.getDay() + 6) % 7);
  return false;
}

function systemContextMatches(ruleValue: string, context: NoteContext | null): boolean | null {
  const { key, expected } = propertyParts(ruleValue);
  if (!key.startsWith("@")) return null;
  if (!expected) return false;

  if (key === "@theme") {
    if (expected !== "light" && expected !== "dark") return false;
    return currentTheme(context) === expected;
  }

  const now = currentDate(context);
  if (key === "@time") {
    const range = parseClockRange(expected);
    return range ? clockRangeMatches(range, minutesOfDay(now)) : false;
  }
  if (key === "@day") {
    const days = parseDays(expected);
    return days ? days.has(now.getDay()) : false;
  }
  if (key === "@schedule") {
    const schedule = parseSchedule(expected);
    return schedule ? scheduleMatches(schedule.days, schedule.range, now) : false;
  }
  return false;
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

function dateAtMinutes(base: Date, dayOffset: number, minutes: number): Date {
  const result = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

function pushFutureBoundary(boundaries: number[], candidate: Date, nowMs: number): void {
  const timestamp = candidate.getTime();
  if (Number.isFinite(timestamp) && timestamp > nowMs) boundaries.push(timestamp);
}

function nextSystemRuleBoundary(rule: ContextRule, now: Date): number | null {
  if (!rule.enabled || !isSystemFallbackRule(rule)) return null;
  const { key, expected } = propertyParts(rule.matchValue);
  if (!expected || key === "@theme") return null;
  const boundaries: number[] = [];
  const nowMs = now.getTime();

  if (key === "@time") {
    const range = parseClockRange(expected);
    if (!range || range.start === range.end) return null;
    for (let offset = 0; offset <= 1; offset += 1) {
      pushFutureBoundary(boundaries, dateAtMinutes(now, offset, range.start), nowMs);
      pushFutureBoundary(boundaries, dateAtMinutes(now, offset, range.end), nowMs);
    }
  } else if (key === "@day") {
    if (!parseDays(expected)) return null;
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    pushFutureBoundary(boundaries, midnight, nowMs);
  } else if (key === "@schedule") {
    const schedule = parseSchedule(expected);
    if (!schedule) return null;
    if (schedule.range.start === schedule.range.end) {
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      pushFutureBoundary(boundaries, midnight, nowMs);
    } else {
      const firstOffset = schedule.range.start > schedule.range.end ? -1 : 0;
      for (let offset = firstOffset; offset <= 7; offset += 1) {
        const start = dateAtMinutes(now, offset, schedule.range.start);
        if (!schedule.days.has(start.getDay())) continue;
        pushFutureBoundary(boundaries, start, nowMs);
        const endOffset = schedule.range.start < schedule.range.end ? offset : offset + 1;
        pushFutureBoundary(boundaries, dateAtMinutes(now, endOffset, schedule.range.end), nowMs);
      }
    }
  }

  return boundaries.length ? Math.min(...boundaries) : null;
}

export function nextSystemContextBoundary(
  rules: readonly ContextRule[],
  now = new Date(),
): number | null {
  if (!Number.isFinite(now.getTime())) return null;
  const boundaries = rules.flatMap((rule) => {
    const boundary = nextSystemRuleBoundary(rule, now);
    return boundary === null ? [] : [boundary];
  });
  return boundaries.length ? Math.min(...boundaries) : null;
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
