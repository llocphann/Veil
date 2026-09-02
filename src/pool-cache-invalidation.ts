import { mediaKind } from "./settings";

export type PoolCandidateVaultEvent = "create" | "delete" | "rename";

function extensionFromPath(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const separator = name.lastIndexOf(".");
  return separator > 0 && separator < name.length - 1 ? name.slice(separator + 1) : "";
}

export function wallpaperMediaPath(path: string): boolean {
  return Boolean(mediaKind({ extension: extensionFromPath(path) }));
}

export function shouldInvalidatePoolCandidates(
  event: PoolCandidateVaultEvent,
  path: string,
  oldPath = "",
  isFolder = false,
): boolean {
  if (isFolder) return event !== "create";
  if (event === "rename") {
    return wallpaperMediaPath(path) || wallpaperMediaPath(oldPath);
  }
  return wallpaperMediaPath(path);
}
