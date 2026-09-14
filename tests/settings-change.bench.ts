import { performance } from "node:perf_hooks";
import { veilSettingsEqual } from "../src/settings-change-detection";
import { classifySettingsChange } from "../src/settings-change-impact";
import { normalizeSettingsPatch } from "../src/settings-patch-normalization";
import {
  DEFAULT_SETTINGS,
  appearanceFromSettings,
  type OpacityExclusionRule,
  type VeilProfile,
  type VeilSettings,
  type WallpaperRule,
} from "../src/settings";

interface BenchmarkCase {
  size: number;
  iterations: number;
}

function buildSettings(size: number): VeilSettings {
  const appearance = appearanceFromSettings(DEFAULT_SETTINGS);
  const profiles: VeilProfile[] = Array.from({ length: size }, (_, index) => ({
    id: `profile-${index}`,
    name: `Profile ${index}`,
    ...appearance,
    wallpaperPath: `Wallpapers/profile-${index}.webp`,
  }));
  const wallpaperRules: WallpaperRule[] = Array.from({ length: size }, (_, index) => ({
    id: `rule-${index}`,
    enabled: true,
    matchType: "path",
    matchValue: `Notes/${index}.md`,
    profileId: index % 2 === 0 ? `profile-${index}` : "",
    wallpaperPath: `Wallpapers/rule-${index}.webp`,
  }));
  const opacityExclusions: OpacityExclusionRule[] = Array.from(
    { length: size },
    (_, index) => ({
      id: `opacity-${index}`,
      enabled: true,
      matchType: "folder",
      matchValue: `Private/${index}`,
      excludePaneSurface: index % 2 === 0,
      excludePaneContent: index % 3 === 0,
    }),
  );
  return {
    ...DEFAULT_SETTINGS,
    profiles,
    wallpaperRules,
    opacityExclusions,
  };
}

function runCase({ size, iterations }: BenchmarkCase): number {
  const previous = buildSettings(size);
  const patch: Partial<VeilSettings> = {
    opacity: previous.opacity === 100 ? 99 : previous.opacity + 1,
  };

  for (let index = 0; index < 20; index += 1) {
    const next = normalizeSettingsPatch(previous, patch);
    veilSettingsEqual(previous, next);
    classifySettingsChange(previous, next);
  }

  let checksum = 0;
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    const next = normalizeSettingsPatch(previous, patch);
    if (veilSettingsEqual(previous, next)) checksum += 1;
    const impact = classifySettingsChange(previous, next);
    if (impact.documentResolution) checksum += 1;
  }
  const elapsed = performance.now() - started;
  if (checksum !== iterations) {
    throw new Error(`Unexpected benchmark checksum: ${checksum}`);
  }
  return elapsed / iterations;
}

const cases: readonly BenchmarkCase[] = [
  { size: 10, iterations: 1000 },
  { size: 50, iterations: 1000 },
  { size: 100, iterations: 1000 },
  { size: 250, iterations: 1000 },
];

process.stdout.write("Settings scalar patch normalization + equality + impact (informational)\n");
for (const benchmarkCase of cases) {
  const milliseconds = runCase(benchmarkCase);
  process.stdout.write(
    `${String(benchmarkCase.size).padStart(3)} profiles/rules/exclusions: ${milliseconds.toFixed(4)} ms/update\n`,
  );
}
