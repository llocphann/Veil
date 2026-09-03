export type WallhavenCategoryMask = "100" | "010" | "001" | "110" | "101" | "011" | "111";
export type WallhavenSorting = "date_added" | "relevance" | "views" | "favorites" | "toplist";

export interface WallhavenSearchOptions {
  query?: string;
  categories?: WallhavenCategoryMask;
  atleast?: string;
  ratios?: string;
  sorting?: WallhavenSorting;
  page?: number;
}

export interface WallhavenWallpaper {
  id: string;
  url: string;
  purity: "sfw";
  category: "general" | "anime" | "people";
  dimensionX: number;
  dimensionY: number;
  resolution: string;
  ratio: string;
  fileSize: number;
  fileType: "image/jpeg" | "image/png";
  path: string;
  thumbs: {
    large: string;
    small: string;
  };
}

export interface WallhavenSearchMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface WallhavenSearchResult {
  data: WallhavenWallpaper[];
  meta: WallhavenSearchMeta;
}

export const WALLHAVEN_DOWNLOAD_FOLDER = "Wallpapers/Wallhaven";
const WALLHAVEN_API_SEARCH = "https://wallhaven.cc/api/v1/search";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function httpsUrlForHost(value: unknown, hostname: string): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname ? url.toString() : null;
  } catch {
    return null;
  }
}

function validResolution(value: string | undefined): string {
  return value && /^\d+x\d+$/.test(value) ? value : "";
}

function validRatios(value: string | undefined): string {
  return value && /^\d+x\d+(?:,\d+x\d+)*$/.test(value) ? value : "";
}

export function wallhavenSearchUrl(options: WallhavenSearchOptions = {}): string {
  const url = new URL(WALLHAVEN_API_SEARCH);
  const query = options.query?.trim();
  const categories = options.categories || "111";
  const sorting = options.sorting || (query ? "relevance" : "date_added");
  const page = Math.max(1, Math.floor(options.page || 1));

  if (query) url.searchParams.set("q", query);
  url.searchParams.set("categories", categories);
  url.searchParams.set("purity", "100");
  url.searchParams.set("sorting", sorting);
  url.searchParams.set("order", "desc");
  if (sorting === "toplist") url.searchParams.set("topRange", "1M");

  const atleast = validResolution(options.atleast);
  if (atleast) url.searchParams.set("atleast", atleast);
  const ratios = validRatios(options.ratios);
  if (ratios) url.searchParams.set("ratios", ratios);
  if (page > 1) url.searchParams.set("page", String(page));
  return url.toString();
}

export function wallhavenLocalPath(wallpaper: Pick<WallhavenWallpaper, "id" | "fileType">): string {
  const extension = wallpaper.fileType === "image/png" ? "png" : "jpg";
  return `${WALLHAVEN_DOWNLOAD_FOLDER}/wallhaven-${wallpaper.id}.${extension}`;
}

export function isWallhavenOriginalUrl(value: string): boolean {
  return httpsUrlForHost(value, "w.wallhaven.cc") !== null;
}

export function isWallhavenThumbnailUrl(value: string): boolean {
  return httpsUrlForHost(value, "th.wallhaven.cc") !== null;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function wallhavenImageBytesMatchType(
  data: ArrayBuffer,
  fileType: WallhavenWallpaper["fileType"],
): boolean {
  const bytes = new Uint8Array(data);
  if (fileType === "image/png") {
    return bytes.length >= PNG_SIGNATURE.length
      && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
  }
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function parseWallpaper(value: unknown): WallhavenWallpaper | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" && /^[a-z0-9]{6}$/.test(value.id) ? value.id : "";
  const url = httpsUrlForHost(value.url, "wallhaven.cc");
  const path = httpsUrlForHost(value.path, "w.wallhaven.cc");
  const thumbs = isRecord(value.thumbs) ? value.thumbs : null;
  const large = thumbs ? httpsUrlForHost(thumbs.large, "th.wallhaven.cc") : null;
  const small = thumbs ? httpsUrlForHost(thumbs.small, "th.wallhaven.cc") : null;
  const fileType = value.file_type === "image/png"
    ? "image/png"
    : value.file_type === "image/jpeg"
      ? "image/jpeg"
      : null;
  const category = value.category === "general" || value.category === "anime" || value.category === "people"
    ? value.category
    : null;
  const dimensionX = positiveInteger(value.dimension_x, 0);
  const dimensionY = positiveInteger(value.dimension_y, 0);
  const fileSize = positiveInteger(value.file_size, 0);
  if (
    !id || !url || !path || !large || !small || !fileType || !category
    || value.purity !== "sfw" || !dimensionX || !dimensionY || !fileSize
  ) return null;

  return {
    id,
    url,
    purity: "sfw",
    category,
    dimensionX,
    dimensionY,
    resolution: typeof value.resolution === "string" ? value.resolution : `${dimensionX}x${dimensionY}`,
    ratio: typeof value.ratio === "string" ? value.ratio : "",
    fileSize,
    fileType,
    path,
    thumbs: { large, small },
  };
}

export function parseWallhavenSearchResponse(value: unknown): WallhavenSearchResult {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    throw new Error("Wallhaven returned an invalid search response.");
  }
  return {
    data: value.data.map(parseWallpaper).filter((item): item is WallhavenWallpaper => item !== null),
    meta: {
      currentPage: positiveInteger(value.meta.current_page, 1),
      lastPage: positiveInteger(value.meta.last_page, 1),
      perPage: positiveInteger(value.meta.per_page, 24),
      total: typeof value.meta.total === "number" && value.meta.total >= 0 ? value.meta.total : 0,
    },
  };
}

export function formatWallhavenFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
