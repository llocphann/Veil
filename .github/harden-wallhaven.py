from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected one {label} target, found {count}")
    return source.replace(old, new)


modal_path = Path("src/wallpaper-library-modal.ts")
modal = modal_path.read_text()
modal = replace_once(
    modal,
    '      text: "Browse vault media or import SFW wallpapers from Wallhaven. Imported files are saved to your vault and used locally.",',
    '      text: "Browse vault media or import safe-for-work wallpapers online. Imported files are saved to your vault and used locally.",',
    "library description",
)
modal = replace_once(
    modal,
    '        placeholder: "Search Wallhaven…",',
    '        placeholder: "Search online wallpapers…",',
    "search placeholder",
)
modal = replace_once(
    modal,
    '        "aria-label": "Search Wallhaven",',
    '        "aria-label": "Search online wallpapers",',
    "search aria label",
)
modal = replace_once(
    modal,
    '      summary.textContent = "Wallhaven is optional and SFW-only. Press Search to connect.";',
    '      summary.textContent = "Online import is optional and safe-for-work only. Press search to connect.";',
    "initial Wallhaven summary",
)

search_start = modal.find("  private async runWallhavenSearch(append: boolean): Promise<void> {")
search_end = modal.find("\n  private renderWallhavenGrid(): void {", search_start)
if search_start < 0 or search_end < 0:
    raise SystemExit("Could not locate Wallhaven search function")
search_function = '''  private async runWallhavenSearch(append: boolean): Promise<void> {
    if (this.wallhavenBusy) return;
    const nextPage = append ? (this.wallhavenMeta?.currentPage || 0) + 1 : 1;
    const sorting = !this.wallhavenQuery.trim() && this.wallhavenSorting === "relevance"
      ? "date_added"
      : this.wallhavenSorting;
    const options: WallhavenSearchOptions = append && this.wallhavenLastSearch
      ? this.wallhavenLastSearch
      : {
          query: this.wallhavenQuery,
          categories: this.wallhavenCategories,
          atleast: this.wallhavenAtleast,
          ratios: this.wallhavenRatios,
          sorting,
        };
    this.wallhavenBusy = true;
    if (this.wallhavenSearchButton) this.wallhavenSearchButton.disabled = true;
    if (this.summaryEl) {
      this.summaryEl.textContent = append
        ? "Loading more from Wallhaven…"
        : "Searching Wallhaven…";
    }

    try {
      const result = await searchWallhavenApi({ ...options, page: nextPage });
      if (append) {
        const known = new Set(this.wallhavenResults.map((wallpaper) => wallpaper.id));
        this.wallhavenResults.push(...result.data.filter((wallpaper) => !known.has(wallpaper.id)));
      } else {
        this.wallhavenResults = result.data;
      }
      this.wallhavenMeta = result.meta;
      this.wallhavenHasSearched = true;
      if (!append) this.wallhavenLastSearch = options;
    } catch (error) {
      new Notice(errorMessage(error));
    } finally {
      this.wallhavenBusy = false;
      if (this.wallhavenSearchButton) this.wallhavenSearchButton.disabled = false;
      this.renderWallhavenGrid();
    }
  }
'''
modal = modal[:search_start] + search_function.rstrip() + modal[search_end:]
modal = replace_once(
    modal,
    "    const downloading = this.wallhavenDownloading.has(wallpaper.id);\n    const selected = target.selectedPath === localPath;",
    "    const downloading = this.wallhavenDownloading.has(wallpaper.id);\n    const downloadBusy = this.wallhavenDownloading.size > 0;\n    const selected = target.selectedPath === localPath;",
    "download busy state",
)
modal = replace_once(
    modal,
    "    select.disabled = downloading;",
    "    select.disabled = downloadBusy;",
    "download button lock",
)
modal = replace_once(
    modal,
    "    if (this.wallhavenDownloading.has(wallpaper.id)) return;",
    "    if (this.wallhavenDownloading.size > 0) return;",
    "single download guard",
)
modal_path.write_text(modal)

wallhaven_path = Path("src/wallhaven.ts")
wallhaven = wallhaven_path.read_text()
helper = '''const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

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

'''
wallhaven = replace_once(
    wallhaven,
    "function parseWallpaper(value: unknown): WallhavenWallpaper | null {",
    helper + "function parseWallpaper(value: unknown): WallhavenWallpaper | null {",
    "image signature helper",
)
wallhaven_path.write_text(wallhaven)

download_path = Path("src/wallhaven-download.ts")
download = download_path.read_text()
download = replace_once(
    download,
    "  isWallhavenOriginalUrl,\n  wallhavenLocalPath,",
    "  isWallhavenOriginalUrl,\n  wallhavenImageBytesMatchType,\n  wallhavenLocalPath,",
    "download helper import",
)
download = replace_once(
    download,
    '  if (response.arrayBuffer.byteLength === 0) {\n    throw new Error("Wallhaven returned an empty wallpaper file.");\n  }\n',
    '  if (response.arrayBuffer.byteLength === 0) {\n    throw new Error("Wallhaven returned an empty wallpaper file.");\n  }\n  if (!wallhavenImageBytesMatchType(response.arrayBuffer, wallpaper.fileType)) {\n    throw new Error("Wallhaven returned invalid image data.");\n  }\n',
    "download payload validation",
)
download_path.write_text(download)

wallhaven_test_path = Path("tests/wallhaven.test.ts")
wallhaven_test = wallhaven_test_path.read_text()
wallhaven_test = replace_once(
    wallhaven_test,
    "  isWallhavenThumbnailUrl,\n  parseWallhavenSearchResponse,",
    "  isWallhavenThumbnailUrl,\n  parseWallhavenSearchResponse,\n  wallhavenImageBytesMatchType,",
    "test helper import",
)
image_test = '''void test("Wallhaven image payloads match their declared type", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 0x00]).buffer;
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).buffer;
  const html = new TextEncoder().encode("<html>").buffer;

  assert.equal(wallhavenImageBytesMatchType(jpeg, "image/jpeg"), true);
  assert.equal(wallhavenImageBytesMatchType(png, "image/png"), true);
  assert.equal(wallhavenImageBytesMatchType(jpeg, "image/png"), false);
  assert.equal(wallhavenImageBytesMatchType(png, "image/jpeg"), false);
  assert.equal(wallhavenImageBytesMatchType(html, "image/jpeg"), false);
});

'''
wallhaven_test = replace_once(
    wallhaven_test,
    'void test("Wallhaven file sizes stay compact for library cards", () => {',
    image_test + 'void test("Wallhaven file sizes stay compact for library cards", () => {',
    "image signature test",
)
wallhaven_test_path.write_text(wallhaven_test)

library_test_path = Path("tests/wallhaven-library.test.ts")
library_test = library_test_path.read_text()
serial_test = r'''void test("Wallhaven serializes full-resolution imports", () => {
  assert.match(library, /const downloadBusy = this\.wallhavenDownloading\.size > 0;/);
  assert.match(library, /select\.disabled = downloadBusy;/);
  assert.match(library, /if \(this\.wallhavenDownloading\.size > 0\) return;/);
});

'''
library_test = replace_once(
    library_test,
    'void test("Wallpaper Library toolbars can wrap on narrow windows", () => {',
    serial_test + 'void test("Wallpaper Library toolbars can wrap on narrow windows", () => {',
    "serialized import test",
)
library_test_path.write_text(library_test)

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text()
changelog = replace_once(
    changelog,
    "- Add an optional SFW Wallhaven browser to Wallpaper Library that searches on demand, keeps pagination tied to the last explicit search, downloads only the selected image into `Wallpapers/Wallhaven/`, and uses the local file afterward.",
    "- Add an optional SFW Wallhaven browser to Wallpaper Library that searches on demand, keeps pagination tied to the last explicit search, serializes full-resolution imports, validates downloaded JPEG/PNG data, saves the selected image into `Wallpapers/Wallhaven/`, and uses the local file afterward.",
    "Wallhaven changelog",
)
changelog_path.write_text(changelog)
