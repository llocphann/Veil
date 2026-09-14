import type { VeilSettings } from "./settings";

export function veilSettingsEqual(previous: VeilSettings, next: VeilSettings): boolean {
  if (previous === next) return true;
  return JSON.stringify(previous) === JSON.stringify(next);
}
