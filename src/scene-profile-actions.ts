import { createProfile, type VeilProfile, type VeilSettings } from "./settings";

export function duplicateSceneProfile(
  existing: VeilProfile[],
  source: VeilProfile,
  settings: VeilSettings,
): VeilProfile {
  const duplicate = createProfile(existing, { ...settings, ...source });
  const sourceName = source.name.trim() || "Scene";
  return {
    ...duplicate,
    name: `${sourceName} copy`.slice(0, 80),
  };
}
