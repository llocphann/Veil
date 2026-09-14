import { mediaKind } from "./settings";

export type PoolCandidateVaultEvent = "create" | "delete" | "rename";

function extensionFromPath(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const separator = name.lastIndexOf(".");
  return separator > 0 && separator < name.length - 1 ? name.slice(separator + 1) : "";
}

function folderForPath(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator >= 0 ? path.slice(0, separator) : "";
}

function cacheKeyIncludesPath(key: string, path: string): boolean {
  const separator = key.lastIndexOf("|");
  if (separator < 0) return true;

  const folder = key.slice(0, separator);
  const scope = key.slice(separator + 1);
  if (scope === "direct") return folderForPath(path) === folder;
  if (scope === "recursive") return !folder || path.startsWith(`${folder}/`);
  return true;
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

export function invalidatePoolCandidatesForVaultEvent(
  candidates: Map<string, string[]>,
  event: PoolCandidateVaultEvent,
  path: string,
  oldPath = "",
  isFolder = false,
): number {
  if (!shouldInvalidatePoolCandidates(event, path, oldPath, isFolder)) return 0;

  if (isFolder) {
    const removed = candidates.size;
    candidates.clear();
    return removed;
  }

  const affectedPaths = event === "rename"
    ? [oldPath, path].filter(wallpaperMediaPath)
    : [path];
  let removed = 0;
  for (const key of Array.from(candidates.keys())) {
    if (!affectedPaths.some((candidatePath) => cacheKeyIncludesPath(key, candidatePath))) continue;
    candidates.delete(key);
    removed += 1;
  }
  return removed;
}
