export function vaultPathTouches(candidate: string, changedPath: string): boolean {
  if (!candidate || !changedPath) return false;
  return candidate === changedPath || candidate.startsWith(`${changedPath}/`);
}

export function vaultChangeAffectsDocument(
  changedPath: string,
  loadedPath: string,
  resolvedPath: string,
): boolean {
  return vaultPathTouches(loadedPath, changedPath)
    || vaultPathTouches(resolvedPath, changedPath);
}
