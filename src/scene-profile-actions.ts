import { createProfile, type VeilProfile, type VeilSettings } from "./settings";

const MAX_SCENE_NAME_LENGTH = 80;
const COPY_SUFFIX = " copy";

function duplicateSceneName(name: string): string {
  const sourceName = name.trim() || "Scene";
  const prefixLimit = MAX_SCENE_NAME_LENGTH - COPY_SUFFIX.length;
  return `${sourceName.slice(0, prefixLimit)}${COPY_SUFFIX}`;
}

export function duplicateSceneProfile(
  existing: VeilProfile[],
  source: VeilProfile,
  settings: VeilSettings,
): VeilProfile {
  const duplicate = createProfile(existing, { ...settings, ...source });
  return {
    ...duplicate,
    name: duplicateSceneName(source.name),
  };
}
