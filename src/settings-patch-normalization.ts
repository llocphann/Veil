import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type VeilSettings,
} from "./settings";

const COLLECTION_KEYS = new Set<keyof VeilSettings>([
  "profiles",
  "wallpaperRules",
  "opacityExclusions",
]);

type PathNormalizer = (path: string) => string;

/**
 * Preserve the exact normalization semantics of normalizeSettings while
 * avoiding O(collection-size) work for the common scalar Settings update.
 * Collection patches fall back to the canonical full normalizer because
 * profile/rule normalization has cross-field integrity requirements.
 */
export function normalizeSettingsPatch(
  previous: VeilSettings,
  patch: Partial<VeilSettings>,
  normalize?: PathNormalizer,
): VeilSettings {
  const keys = Object.keys(patch) as (keyof VeilSettings)[];
  if (keys.length === 0) return previous;

  if (keys.some((key) => COLLECTION_KEYS.has(key))) {
    return normalizeSettings({ ...previous, ...patch }, normalize);
  }

  // Only the patched scalar fields are copied from this canonical normalized
  // probe. DEFAULT_SETTINGS intentionally provides the same invalid-value
  // fallback that a full normalizeSettings({ ...previous, ...patch }) uses.
  const normalizedPatch = normalizeSettings(
    { ...DEFAULT_SETTINGS, ...patch },
    normalize,
  );
  const next = { ...previous };
  const writable = next as unknown as Record<keyof VeilSettings, VeilSettings[keyof VeilSettings]>;
  const normalized = normalizedPatch as unknown as Record<
    keyof VeilSettings,
    VeilSettings[keyof VeilSettings]
  >;
  for (const key of keys) writable[key] = normalized[key];
  return next;
}
