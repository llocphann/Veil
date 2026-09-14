export interface WallpaperPathCandidate {
  path: string;
}

export function randomVisibleWallpaper<T extends WallpaperPathCandidate>(
  files: readonly T[],
  visibleLimit: number,
  selectedPath: string,
  random: () => number = Math.random,
): T | null {
  const visible = files.slice(0, Math.max(0, visibleLimit));
  if (visible.length === 0) return null;
  const choices = visible.length > 1
    ? visible.filter((file) => file.path !== selectedPath)
    : visible;
  if (choices.length === 0) return visible[0] || null;
  const index = Math.min(choices.length - 1, Math.floor(Math.max(0, random()) * choices.length));
  return choices[index] || null;
}
