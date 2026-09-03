import { TFile, TFolder, normalizePath, requestUrl, type Vault } from "obsidian";
import {
  WALLHAVEN_DOWNLOAD_FOLDER,
  isWallhavenOriginalUrl,
  wallhavenImageBytesMatchType,
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
    try {
      await vault.createFolder(current);
    } catch (error) {
      if (vault.getAbstractFileByPath(current) instanceof TFolder) continue;
      throw error;
    }
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
    throw: false,
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
  if (!wallhavenImageBytesMatchType(response.arrayBuffer, wallpaper.fileType)) {
    throw new Error("Wallhaven returned invalid image data.");
  }

  await ensureFolder(vault, WALLHAVEN_DOWNLOAD_FOLDER);
  const created = vault.getAbstractFileByPath(localPath);
  if (created instanceof TFile) return created;
  if (created) throw new Error(`Cannot save ${localPath}: that path is already a folder.`);
  try {
    return await vault.createBinary(localPath, response.arrayBuffer);
  } catch (error) {
    const concurrent = vault.getAbstractFileByPath(localPath);
    if (concurrent instanceof TFile) return concurrent;
    throw error;
  }
}
