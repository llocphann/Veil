import { requestUrl } from "obsidian";
import {
  parseWallhavenSearchResponse,
  wallhavenSearchUrl,
  type WallhavenSearchOptions,
  type WallhavenSearchResult,
} from "./wallhaven";

export async function searchWallhaven(options: WallhavenSearchOptions): Promise<WallhavenSearchResult> {
  const response = await requestUrl({
    url: wallhavenSearchUrl(options),
    method: "GET",
    headers: { Accept: "application/json" },
    throw: false,
  });
  if (response.status === 429) {
    throw new Error("Wallhaven rate limit reached. Try again in a moment.");
  }
  if (response.status !== 200) {
    throw new Error(`Wallhaven search failed with HTTP ${response.status}.`);
  }
  return parseWallhavenSearchResponse(response.json);
}
