import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWallhavenFileSize,
  isWallhavenOriginalUrl,
  isWallhavenThumbnailUrl,
  parseWallhavenSearchResponse,
  wallhavenImageBytesMatchType,
  wallhavenLocalPath,
  wallhavenSearchUrl,
} from "../src/wallhaven";

function wallpaper(overrides: Record<string, unknown> = {}) {
  return {
    id: "94x38z",
    url: "https://wallhaven.cc/w/94x38z",
    purity: "sfw",
    category: "anime",
    dimension_x: 6742,
    dimension_y: 3534,
    resolution: "6742x3534",
    ratio: "1.91",
    file_size: 5070446,
    file_type: "image/jpeg",
    path: "https://w.wallhaven.cc/full/94/wallhaven-94x38z.jpg",
    thumbs: {
      large: "https://th.wallhaven.cc/lg/94/94x38z.jpg",
      small: "https://th.wallhaven.cc/small/94/94x38z.jpg",
    },
    ...overrides,
  };
}

void test("Wallhaven search is SFW-only and uses supported API filters", () => {
  const url = new URL(wallhavenSearchUrl({
    query: "dark forest",
    categories: "110",
    atleast: "2560x1440",
    ratios: "16x9",
    sorting: "toplist",
    page: 3,
  }));
  assert.equal(url.origin, "https://wallhaven.cc");
  assert.equal(url.pathname, "/api/v1/search");
  assert.equal(url.searchParams.get("q"), "dark forest");
  assert.equal(url.searchParams.get("categories"), "110");
  assert.equal(url.searchParams.get("purity"), "100");
  assert.equal(url.searchParams.get("atleast"), "2560x1440");
  assert.equal(url.searchParams.get("ratios"), "16x9");
  assert.equal(url.searchParams.get("sorting"), "toplist");
  assert.equal(url.searchParams.get("topRange"), "1M");
  assert.equal(url.searchParams.get("page"), "3");
  assert.equal(url.searchParams.has("apikey"), false);
});

void test("Wallhaven response parser accepts only whitelisted SFW image URLs", () => {
  const parsed = parseWallhavenSearchResponse({
    data: [
      wallpaper(),
      wallpaper({ id: "abc123", purity: "sketchy" }),
      wallpaper({ id: "def456", path: "https://example.com/wallpaper.jpg" }),
      wallpaper({ id: "ghi789", thumbs: { large: "https://example.com/a.jpg", small: "https://th.wallhaven.cc/small/a.jpg" } }),
    ],
    meta: { current_page: 1, last_page: 4, per_page: 24, total: 90 },
  });
  assert.equal(parsed.data.length, 1);
  assert.equal(parsed.data[0]?.id, "94x38z");
  assert.deepEqual(parsed.meta, { currentPage: 1, lastPage: 4, perPage: 24, total: 90 });
});

void test("Wallhaven local paths are deterministic and image-only", () => {
  const parsed = parseWallhavenSearchResponse({
    data: [wallpaper()],
    meta: { current_page: 1, last_page: 1, per_page: 24, total: 1 },
  });
  const first = parsed.data[0];
  assert.ok(first);
  assert.equal(wallhavenLocalPath(first), "Wallpapers/Wallhaven/wallhaven-94x38z.jpg");
  assert.equal(
    wallhavenLocalPath({ id: "zzzzzz", fileType: "image/png" }),
    "Wallpapers/Wallhaven/wallhaven-zzzzzz.png",
  );
});

void test("Wallhaven URL guards reject non-Wallhaven and insecure origins", () => {
  assert.equal(isWallhavenOriginalUrl("https://w.wallhaven.cc/full/94/wallhaven-94x38z.jpg"), true);
  assert.equal(isWallhavenOriginalUrl("http://w.wallhaven.cc/full/94/wallhaven-94x38z.jpg"), false);
  assert.equal(isWallhavenOriginalUrl("https://wallhaven.cc/w/94x38z"), false);
  assert.equal(isWallhavenThumbnailUrl("https://th.wallhaven.cc/lg/94/94x38z.jpg"), true);
  assert.equal(isWallhavenThumbnailUrl("https://w.wallhaven.cc/lg/94/94x38z.jpg"), false);
});

void test("Wallhaven image payloads match their declared type", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00]).buffer;
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).buffer;
  const html = new TextEncoder().encode("<html>").buffer;

  assert.equal(wallhavenImageBytesMatchType(jpeg, "image/jpeg"), true);
  assert.equal(wallhavenImageBytesMatchType(png, "image/png"), true);
  assert.equal(wallhavenImageBytesMatchType(jpeg, "image/png"), false);
  assert.equal(wallhavenImageBytesMatchType(png, "image/jpeg"), false);
  assert.equal(wallhavenImageBytesMatchType(html, "image/jpeg"), false);
});

void test("Wallhaven file sizes stay compact for library cards", () => {
  assert.equal(formatWallhavenFileSize(512), "1 KB");
  assert.equal(formatWallhavenFileSize(1024 * 512), "512 KB");
  assert.equal(formatWallhavenFileSize(5 * 1024 * 1024), "5.0 MB");
});
