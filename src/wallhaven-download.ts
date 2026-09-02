import { TFile, TFolder, normalizePath, requestUrl, type Vault } from "obsidian";
import {
  WALLHAVEN_DOWNLOAD_FOLDER,
  isWallhavenOriginalUrl,
  wallhavenLocalPath,
  type WallhavenWallpaper,
} from "./wallhaven";

function headerValue(headers: Record<string, string>, name: string): string {
  const expected = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === expected);
  return entry?.[1] || "";
}

async function ensureFolder(vault: Vault, folderPath: string): Promise<void> {
  const segments = normalizePath(folderPath).split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing = vault.getAbstractFileByPath(current);
    if (existing instanceof TFolder) continue;
    if (existing) throw new Error(`Cannot create ${current}: a file already uses that path.`);
    await vault.createFolder(current);
  }
}

export async function importWallhavenWallpaper(
  vault: Vault,
  wallpaper: WallhavenWallpaper,
): Promise<TFile> {
  const localPath = normalizePath(wallhavenLocalPath(wallpaper));
  const existing = vault.getAbstractFileByPath(localPath);
  if (existing instanceof TFile) return existing;
  if (existing) throw new Error(`Cannot save ${localPath}: that path is already a folder.`);
  if (!isWallhavenOriginalUrl(wallpaper.path)) {
    throw new Error("Wallhaven returned an unsafe download URL.");
  }

  const response = await requestUrl({
    url: wallpaper.path,
    method: "GET",
    headers: { Accept: wallpaper.fileType },
  });
  if (response.status === 429) {
    throw new Error("Wallhaven rate limit reached. Try again in a moment.");
  }
  if (response.status !== 200) {
    throw new Error(`Wallhaven download failed with HTTP ${response.status}.`);
  }
  const contentType = headerValue(response.headers, "content-type").toLowerCase();
  if (contentType && !contentType.startsWith(wallpaper.fileType)) {
    throw new Error("Wallhaven returned an unexpected file type.");
  }
  if (response.arrayBuffer.byteLength === 0) {
    throw new Error("Wallhaven returned an empty wallpaper file.");
  }

  await ensureFolder(vault, WALLHAVEN_DOWNLOAD_FOLDER);
  return vault.createBinary(localPath, response.arrayBuffer);
}
