import { Modal, Notice, TFile, setIcon, type App } from "obsidian";
import { searchWallhaven as searchWallhavenApi } from "./wallhaven-client";
import { importWallhavenWallpaper } from "./wallhaven-download";
import {
  formatWallhavenFileSize,
  wallhavenLocalPath,
  type WallhavenCategoryMask,
  type WallhavenSearchMeta,
  type WallhavenSearchOptions,
  type WallhavenSorting,
  type WallhavenWallpaper,
} from "./wallhaven";
import { randomVisibleWallpaper } from "./wallpaper-library-random";
import { mediaKind, type MediaKind } from "./settings";
import type { WallpaperLibraryState } from "./wallpaper-library-state";
import type { WallpaperLibraryTarget } from "./wallpaper-library-targets";

type LibrarySource = "vault" | "wallhaven";
type LibraryView = "all" | "favorites" | "recent";
type LibraryKind = "all" | Exclude<MediaKind, "">;
type LibrarySort = "default" | "name" | "newest" | "oldest";

const INITIAL_VISIBLE_ITEMS = 60;
const VISIBLE_ITEMS_STEP = 60;
const ALL_FOLDERS = "__all__";
const ROOT_FOLDER = "__root__";

interface WallpaperLibraryController {
  getTargets: () => WallpaperLibraryTarget[];
  getState: () => WallpaperLibraryState;
  selectWallpaper: (targetId: string, path: string) => void;
  toggleFavorite: (path: string) => void;
}

function topLevelFolder(path: string): string {
  const separator = path.indexOf("/");
  return separator < 0 ? ROOT_FOLDER : path.slice(0, separator);
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Wallhaven request failed.";
}

export class WallpaperLibraryModal extends Modal {
  private readonly controller: WallpaperLibraryController;
  private source: LibrarySource = "vault";
  private sourceEl: HTMLElement | null = null;
  private sourceButtons = new Map<LibrarySource, HTMLButtonElement>();
  private files: TFile[] = [];
  private query = "";
  private view: LibraryView = "all";
  private kind: LibraryKind = "all";
  private sort: LibrarySort = "default";
  private folderScope = ALL_FOLDERS;
  private targetId = "";
  private visibleLimit = INITIAL_VISIBLE_ITEMS;
  private gridEl: HTMLElement | null = null;
  private summaryEl: HTMLElement | null = null;
  private moreEl: HTMLElement | null = null;
  private filterButtons = new Map<LibraryView, HTMLButtonElement>();
  private wallhavenResults: WallhavenWallpaper[] = [];
  private wallhavenMeta: WallhavenSearchMeta | null = null;
  private wallhavenHasSearched = false;
  private wallhavenLastSearch: WallhavenSearchOptions | null = null;
  private wallhavenQuery = "";
  private wallhavenCategories: WallhavenCategoryMask = "111";
  private wallhavenAtleast = "";
  private wallhavenRatios = "";
  private wallhavenSorting: WallhavenSorting = "relevance";
  private wallhavenBusy = false;
  private wallhavenSearchButton: HTMLButtonElement | null = null;
  private wallhavenDownloading = new Set<string>();

  constructor(app: App, controller: WallpaperLibraryController) {
    super(app);
    this.controller = controller;
  }

  onOpen(): void {
    this.modalEl.classList.add("veil-wallpaper-library-modal");
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Wallpaper library" });
    this.contentEl.createEl("p", {
      cls: "veil-wallpaper-library-description",
      text: "Browse vault media or import SFW wallpapers from Wallhaven. Imported files are saved to your vault and used locally.",
    });

    this.refreshVaultFiles();
    const targets = this.controller.getTargets();
    this.targetId = targets[0]?.id || "";

    const targetRow = this.contentEl.createDiv({ cls: "veil-wallpaper-library-target-row" });
    targetRow.createSpan({ cls: "veil-wallpaper-library-target-label", text: "Apply to" });
    const targetSelect = targetRow.createEl("select", {
      cls: "veil-wallpaper-library-target",
      attr: { "aria-label": "Apply wallpaper to" },
    });
    this.populateTargetSelect(targetSelect);
    targetSelect.addEventListener("change", () => {
      this.targetId = targetSelect.value;
      this.ensureActiveTarget();
      targetSelect.value = this.targetId;
      this.renderActiveGrid();
    });

    const sourceRow = this.contentEl.createDiv({ cls: "veil-wallpaper-library-toolbar" });
    sourceRow.createSpan({ cls: "veil-wallpaper-library-target-label", text: "Source" });
    const sourceButtons = sourceRow.createDiv({ cls: "veil-wallpaper-library-filters" });
    for (const [source, label] of [["vault", "Vault"], ["wallhaven", "Wallhaven"]] as const) {
      const button = sourceButtons.createEl("button", {
        cls: "veil-wallpaper-library-filter",
        text: label,
        attr: { type: "button", "aria-pressed": "false" },
      });
      button.addEventListener("click", () => this.setSource(source));
      this.sourceButtons.set(source, button);
    }

    this.sourceEl = this.contentEl.createDiv({ cls: "veil-wallpaper-library-source" });
    this.updateSourceButtons();
    this.renderSource();
  }

  onClose(): void {
    this.files = [];
    this.filterButtons.clear();
    this.sourceButtons.clear();
    this.wallhavenResults = [];
    this.wallhavenMeta = null;
    this.wallhavenDownloading.clear();
    this.sourceEl = null;
    this.gridEl = null;
    this.summaryEl = null;
    this.moreEl = null;
    this.wallhavenSearchButton = null;
    this.contentEl.empty();
  }

  private refreshVaultFiles(): void {
    this.files = this.app.vault.getFiles()
      .filter((file) => Boolean(mediaKind(file)))
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  private setSource(source: LibrarySource): void {
    if (this.source === source) return;
    this.source = source;
    this.updateSourceButtons();
    this.renderSource();
  }

  private updateSourceButtons(): void {
    for (const [source, button] of this.sourceButtons) {
      const active = source === this.source;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
  }

  private renderSource(): void {
    const sourceEl = this.sourceEl;
    if (!sourceEl) return;
    sourceEl.empty();
    this.gridEl = null;
    this.summaryEl = null;
    this.moreEl = null;
    this.wallhavenSearchButton = null;
    if (this.source === "wallhaven") this.renderWallhavenSource(sourceEl);
    else this.renderVaultSource(sourceEl);
  }

  private renderVaultSource(container: HTMLElement): void {
    const toolbar = container.createDiv({ cls: "veil-wallpaper-library-toolbar" });
    const search = toolbar.createEl("input", {
      cls: "veil-wallpaper-library-search",
      attr: {
        type: "search",
        placeholder: "Search wallpaper paths…",
        "aria-label": "Search wallpaper library",
      },
    });
    search.value = this.query;
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLowerCase();
      this.resetVisibleLimit();
    });

    const filters = toolbar.createDiv({ cls: "veil-wallpaper-library-filters" });
    this.filterButtons.clear();
    for (const [view, label] of [
      ["all", "All"],
      ["favorites", "Favorites"],
      ["recent", "Recent"],
    ] as const) {
      const button = filters.createEl("button", {
        cls: "veil-wallpaper-library-filter",
        text: label,
        attr: { type: "button", "aria-pressed": "false" },
      });
      button.addEventListener("click", () => {
        this.view = view;
        this.visibleLimit = INITIAL_VISIBLE_ITEMS;
        this.updateFilterButtons();
        this.renderVaultGrid();
      });
      this.filterButtons.set(view, button);
    }

    const folderSelect = toolbar.createEl("select", {
      cls: "veil-wallpaper-library-folder",
      attr: { "aria-label": "Filter wallpaper folder" },
    });
    folderSelect.createEl("option", { value: ALL_FOLDERS, text: "All folders" });
    const folders = Array.from(new Set(this.files.map((file) => topLevelFolder(file.path))))
      .sort((left, right) => {
        if (left === ROOT_FOLDER) return -1;
        if (right === ROOT_FOLDER) return 1;
        return left.localeCompare(right);
      });
    for (const folder of folders) {
      folderSelect.createEl("option", {
        value: folder,
        text: folder === ROOT_FOLDER ? "Vault root" : folder,
      });
    }
    folderSelect.value = this.folderScope;
    folderSelect.addEventListener("change", () => {
      this.folderScope = folderSelect.value || ALL_FOLDERS;
      this.resetVisibleLimit();
    });

    const kindSelect = toolbar.createEl("select", {
      cls: "veil-wallpaper-library-kind",
      attr: { "aria-label": "Filter wallpaper media type" },
    });
    for (const [value, label] of [
      ["all", "All media"],
      ["image", "Images"],
      ["video", "Videos"],
    ] as const) {
      kindSelect.createEl("option", { value, text: label });
    }
    kindSelect.value = this.kind;
    kindSelect.addEventListener("change", () => {
      const value = kindSelect.value;
      this.kind = value === "image" || value === "video" ? value : "all";
      this.resetVisibleLimit();
    });

    const sortSelect = toolbar.createEl("select", {
      cls: "veil-wallpaper-library-sort",
      attr: { "aria-label": "Sort wallpaper library" },
    });
    for (const [value, label] of [
      ["default", "Default order"],
      ["name", "Name"],
      ["newest", "Newest modified"],
      ["oldest", "Oldest modified"],
    ] as const) {
      sortSelect.createEl("option", { value, text: label });
    }
    sortSelect.value = this.sort;
    sortSelect.addEventListener("change", () => {
      const value = sortSelect.value;
      this.sort = value === "name" || value === "newest" || value === "oldest"
        ? value
        : "default";
      this.resetVisibleLimit();
    });

    const randomButton = toolbar.createEl("button", {
      cls: "veil-wallpaper-library-random",
      text: "Random visible",
      attr: { type: "button" },
    });
    randomButton.addEventListener("click", () => this.selectRandomVisible());

    this.summaryEl = container.createDiv({ cls: "veil-wallpaper-library-summary" });
    this.gridEl = container.createDiv({ cls: "veil-wallpaper-library-grid" });
    this.moreEl = container.createDiv({ cls: "veil-wallpaper-library-more" });
    this.updateFilterButtons();
    this.renderVaultGrid();
  }

  private renderWallhavenSource(container: HTMLElement): void {
    const toolbar = container.createDiv({ cls: "veil-wallpaper-library-toolbar" });
    const search = toolbar.createEl("input", {
      cls: "veil-wallpaper-library-search",
      attr: {
        type: "search",
        placeholder: "Search Wallhaven…",
        "aria-label": "Search Wallhaven",
      },
    });
    search.value = this.wallhavenQuery;
    search.addEventListener("input", () => {
      this.wallhavenQuery = search.value;
    });
    search.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void this.runWallhavenSearch(false);
    });

    const categorySelect = toolbar.createEl("select", {
      attr: { "aria-label": "Wallhaven category" },
    });
    for (const [value, label] of [
      ["111", "All categories"],
      ["100", "General"],
      ["010", "Anime"],
      ["001", "People"],
    ] as const) {
      categorySelect.createEl("option", { value, text: label });
    }
    categorySelect.value = this.wallhavenCategories;
    categorySelect.addEventListener("change", () => {
      const value = categorySelect.value;
      this.wallhavenCategories = value === "100" || value === "010" || value === "001"
        ? value
        : "111";
    });

    const resolutionSelect = toolbar.createEl("select", {
      attr: { "aria-label": "Wallhaven minimum resolution" },
    });
    for (const [value, label] of [
      ["", "Any resolution"],
      ["1920x1080", "≥ 1920×1080"],
      ["2560x1440", "≥ 2560×1440"],
      ["3440x1440", "≥ 3440×1440"],
      ["3840x2160", "≥ 3840×2160"],
    ] as const) {
      resolutionSelect.createEl("option", { value, text: label });
    }
    resolutionSelect.value = this.wallhavenAtleast;
    resolutionSelect.addEventListener("change", () => {
      this.wallhavenAtleast = resolutionSelect.value;
    });

    const ratioSelect = toolbar.createEl("select", {
      attr: { "aria-label": "Wallhaven aspect ratio" },
    });
    for (const [value, label] of [
      ["", "Any ratio"],
      ["16x9", "16:9"],
      ["16x10", "16:10"],
      ["21x9", "21:9"],
      ["9x16", "9:16"],
    ] as const) {
      ratioSelect.createEl("option", { value, text: label });
    }
    ratioSelect.value = this.wallhavenRatios;
    ratioSelect.addEventListener("change", () => {
      this.wallhavenRatios = ratioSelect.value;
    });

    const sortSelect = toolbar.createEl("select", {
      attr: { "aria-label": "Wallhaven sort order" },
    });
    for (const [value, label] of [
      ["relevance", "Relevance"],
      ["date_added", "Newest"],
      ["toplist", "Toplist"],
      ["favorites", "Favorites"],
      ["views", "Views"],
    ] as const) {
      sortSelect.createEl("option", { value, text: label });
    }
    sortSelect.value = this.wallhavenSorting;
    sortSelect.addEventListener("change", () => {
      const value = sortSelect.value;
      this.wallhavenSorting = value === "date_added" || value === "toplist"
        || value === "favorites" || value === "views"
        ? value
        : "relevance";
    });

    this.wallhavenSearchButton = toolbar.createEl("button", {
      text: "Search",
      attr: { type: "button" },
    });
    this.wallhavenSearchButton.addEventListener("click", () => {
      void this.runWallhavenSearch(false);
    });

    this.summaryEl = container.createDiv({ cls: "veil-wallpaper-library-summary" });
    this.gridEl = container.createDiv({ cls: "veil-wallpaper-library-grid" });
    this.moreEl = container.createDiv({ cls: "veil-wallpaper-library-more" });
    this.renderWallhavenGrid();
  }

  private populateTargetSelect(select: HTMLSelectElement): void {
    select.empty();
    const targets = this.controller.getTargets();
    for (const target of targets) {
      select.createEl("option", { value: target.id, text: target.label });
    }
    this.ensureActiveTarget();
    select.value = this.targetId;
  }

  private activeTarget(): WallpaperLibraryTarget {
    const targets = this.controller.getTargets();
    const target = targets.find((candidate) => candidate.id === this.targetId) || targets[0];
    return target || { id: "default", label: "Default appearance", selectedPath: "" };
  }

  private ensureActiveTarget(): void {
    const target = this.activeTarget();
    this.targetId = target.id;
  }

  private resetVisibleLimit(): void {
    this.visibleLimit = INITIAL_VISIBLE_ITEMS;
    this.renderVaultGrid();
  }

  private updateFilterButtons(): void {
    for (const [view, button] of this.filterButtons) {
      const active = view === this.view;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    }
  }

  private visibleFiles(): TFile[] {
    const state = this.controller.getState();
    const favorites = new Set(state.favorites);
    const recentOrder = new Map(state.recent.map((path, index) => [path, index]));
    let files = this.files;

    if (this.view === "favorites") {
      files = files.filter((file) => favorites.has(file.path));
    } else if (this.view === "recent") {
      files = files
        .filter((file) => recentOrder.has(file.path))
        .sort((left, right) =>
          (recentOrder.get(left.path) ?? Number.MAX_SAFE_INTEGER)
          - (recentOrder.get(right.path) ?? Number.MAX_SAFE_INTEGER));
    }

    if (this.folderScope !== ALL_FOLDERS) {
      files = files.filter((file) => topLevelFolder(file.path) === this.folderScope);
    }
    if (this.kind !== "all") {
      files = files.filter((file) => mediaKind(file) === this.kind);
    }
    if (this.query) {
      files = files.filter((file) => file.path.toLowerCase().includes(this.query));
    }

    if (this.sort === "name") {
      files = [...files].sort((left, right) =>
        left.name.localeCompare(right.name) || left.path.localeCompare(right.path));
    } else if (this.sort === "newest") {
      files = [...files].sort((left, right) =>
        right.stat.mtime - left.stat.mtime || left.path.localeCompare(right.path));
    } else if (this.sort === "oldest") {
      files = [...files].sort((left, right) =>
        left.stat.mtime - right.stat.mtime || left.path.localeCompare(right.path));
    }
    return files;
  }

  private selectRandomVisible(): void {
    const target = this.activeTarget();
    const selected = randomVisibleWallpaper(
      this.visibleFiles(),
      this.visibleLimit,
      target.selectedPath,
    );
    if (!selected) return;
    this.controller.selectWallpaper(target.id, selected.path);
    this.renderVaultGrid();
  }

  private renderActiveGrid(): void {
    if (this.source === "wallhaven") this.renderWallhavenGrid();
    else this.renderVaultGrid();
  }

  private renderVaultGrid(): void {
    if (this.source !== "vault") return;
    const grid = this.gridEl;
    const summary = this.summaryEl;
    const more = this.moreEl;
    if (!grid || !summary || !more) return;

    grid.empty();
    more.empty();
    const target = this.activeTarget();
    const files = this.visibleFiles();
    const visible = files.slice(0, this.visibleLimit);
    const imageCount = files.reduce((count, file) => count + Number(mediaKind(file) === "image"), 0);
    const videoCount = files.length - imageCount;
    const countText = files.length === 1
      ? `1 wallpaper · ${imageCount} image · ${videoCount} videos`
      : `${files.length} wallpapers · ${imageCount} images · ${videoCount} videos`;
    summary.textContent = `${countText} · Apply to: ${target.label}`;

    if (visible.length === 0) {
      grid.createDiv({
        cls: "veil-wallpaper-library-empty",
        text: this.view === "favorites"
          ? "No favorite wallpapers match this view."
          : this.view === "recent"
            ? "No recently selected wallpapers match this view."
            : "No supported wallpaper media match these filters.",
      });
      return;
    }

    const state = this.controller.getState();
    const favorites = new Set(state.favorites);
    for (const file of visible) {
      this.renderCard(grid, file, favorites.has(file.path), file.path === target.selectedPath, target);
    }

    if (visible.length < files.length) {
      const button = more.createEl("button", {
        cls: "veil-wallpaper-library-show-more",
        text: `Show ${Math.min(VISIBLE_ITEMS_STEP, files.length - visible.length)} more`,
        attr: { type: "button" },
      });
      button.addEventListener("click", () => {
        this.visibleLimit += VISIBLE_ITEMS_STEP;
        this.renderVaultGrid();
      });
    }
  }

  private async runWallhavenSearch(append: boolean): Promise<void> {
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
  private renderWallhavenGrid(): void {
    if (this.source !== "wallhaven") return;
    const grid = this.gridEl;
    const summary = this.summaryEl;
    const more = this.moreEl;
    if (!grid || !summary || !more) return;
    grid.empty();
    more.empty();
    const target = this.activeTarget();

    if (!this.wallhavenHasSearched) {
      summary.textContent = "Wallhaven is optional and SFW-only. Press Search to connect.";
      grid.createDiv({
        cls: "veil-wallpaper-library-empty",
        text: "Search Wallhaven to import a wallpaper into your vault.",
      });
      return;
    }

    const meta = this.wallhavenMeta;
    const total = meta?.total ?? this.wallhavenResults.length;
    summary.textContent = `${total} SFW results · ${this.wallhavenResults.length} loaded · Apply to: ${target.label}`;
    if (this.wallhavenResults.length === 0) {
      grid.createDiv({ cls: "veil-wallpaper-library-empty", text: "No Wallhaven wallpapers matched this search." });
      return;
    }

    for (const wallpaper of this.wallhavenResults) {
      this.renderWallhavenCard(grid, wallpaper, target);
    }

    if (meta && meta.currentPage < meta.lastPage) {
      const button = more.createEl("button", {
        cls: "veil-wallpaper-library-show-more",
        text: this.wallhavenBusy ? "Loading…" : "Load more",
        attr: { type: "button" },
      });
      button.disabled = this.wallhavenBusy;
      button.addEventListener("click", () => {
        void this.runWallhavenSearch(true);
      });
    }
  }

  private renderWallhavenCard(
    grid: HTMLElement,
    wallpaper: WallhavenWallpaper,
    target: WallpaperLibraryTarget,
  ): void {
    const localPath = wallhavenLocalPath(wallpaper);
    const local = this.app.vault.getAbstractFileByPath(localPath);
    const downloaded = local instanceof TFile;
    const downloading = this.wallhavenDownloading.has(wallpaper.id);
    const selected = target.selectedPath === localPath;
    const card = grid.createDiv({ cls: "veil-wallpaper-library-card" });
    card.dataset.selected = String(selected);

    const select = card.createEl("button", {
      cls: "veil-wallpaper-library-select",
      attr: {
        type: "button",
        "aria-label": downloaded
          ? `Use downloaded Wallhaven ${wallpaper.id} for ${target.label}`
          : `Download Wallhaven ${wallpaper.id} and use it for ${target.label}`,
      },
    });
    select.disabled = downloading;
    select.setCssStyles({
      height: "auto",
      minHeight: "0",
      maxHeight: "none",
      whiteSpace: "normal",
    });

    const preview = select.createDiv({ cls: "veil-wallpaper-library-preview" });
    preview.setCssStyles({ flex: "0 0 auto" });
    const image = preview.createEl("img", {
      attr: {
        src: wallpaper.thumbs.large,
        alt: "",
        loading: "lazy",
        decoding: "async",
        draggable: "false",
        referrerpolicy: "no-referrer",
      },
    });
    image.addEventListener("error", () => preview.classList.add("is-error"), { once: true });
    preview.createSpan({
      cls: "veil-wallpaper-library-type",
      text: downloading ? "DOWNLOADING" : downloaded ? "IN VAULT" : "WALLHAVEN",
    });
    select.createSpan({ cls: "veil-wallpaper-library-name", text: `wallhaven-${wallpaper.id}` });
    select.createSpan({
      cls: "veil-wallpaper-library-path",
      text: `${wallpaper.resolution} · ${formatWallhavenFileSize(wallpaper.fileSize)} · ${wallpaper.category}`,
    });
    select.addEventListener("click", () => {
      void this.importAndSelectWallhaven(wallpaper, target.id);
    });
  }

  private async importAndSelectWallhaven(wallpaper: WallhavenWallpaper, targetId: string): Promise<void> {
    if (this.wallhavenDownloading.has(wallpaper.id)) return;
    const localPath = wallhavenLocalPath(wallpaper);
    const existed = this.app.vault.getAbstractFileByPath(localPath) instanceof TFile;
    this.wallhavenDownloading.add(wallpaper.id);
    this.renderWallhavenGrid();
    try {
      const file = await importWallhavenWallpaper(this.app.vault, wallpaper);
      if (!this.files.some((candidate) => candidate.path === file.path)) {
        this.files.push(file);
        this.files.sort((left, right) => left.path.localeCompare(right.path));
      }
      this.controller.selectWallpaper(targetId, file.path);
      new Notice(existed ? "Applied downloaded Wallhaven wallpaper." : `Saved ${file.path}`);
    } catch (error) {
      new Notice(errorMessage(error));
    } finally {
      this.wallhavenDownloading.delete(wallpaper.id);
      this.renderWallhavenGrid();
    }
  }

  private renderCard(
    grid: HTMLElement,
    file: TFile,
    favorite: boolean,
    selected: boolean,
    target: WallpaperLibraryTarget,
  ): void {
    const kind = mediaKind(file);
    if (!kind) return;
    const card = grid.createDiv({ cls: "veil-wallpaper-library-card" });
    card.dataset.selected = String(selected);

    const select = card.createEl("button", {
      cls: "veil-wallpaper-library-select",
      attr: {
        type: "button",
        "aria-label": `Use ${file.path} for ${target.label}`,
      },
    });
    // Obsidian and themes commonly give every button an input-sized fixed
    // height. This card stays a semantic button, but opts out of that global
    // sizing so its 16:10 preview can determine the card height.
    select.setCssStyles({
      height: "auto",
      minHeight: "0",
      maxHeight: "none",
      whiteSpace: "normal",
    });

    const preview = select.createDiv({ cls: "veil-wallpaper-library-preview" });
    preview.setCssStyles({ flex: "0 0 auto" });
    if (kind === "image") {
      const image = preview.createEl("img", {
        attr: {
          src: this.app.vault.getResourcePath(file),
          alt: "",
          loading: "lazy",
          decoding: "async",
          draggable: "false",
        },
      });
      image.addEventListener("error", () => preview.classList.add("is-error"), { once: true });
    } else {
      const icon = preview.createSpan({ cls: "veil-wallpaper-library-video-icon" });
      setIcon(icon, "video");
    }
    preview.createSpan({
      cls: "veil-wallpaper-library-type",
      text: file.extension.toUpperCase(),
    });
    select.createSpan({ cls: "veil-wallpaper-library-name", text: file.name });
    select.createSpan({ cls: "veil-wallpaper-library-path", text: file.path });
    select.addEventListener("click", () => {
      this.controller.selectWallpaper(target.id, file.path);
      this.renderVaultGrid();
    });

    const favoriteButton = card.createEl("button", {
      cls: "veil-wallpaper-library-favorite",
      attr: {
        type: "button",
        title: favorite ? "Remove from favorites" : "Add to favorites",
        "aria-label": favorite ? `Remove ${file.name} from favorites` : `Add ${file.name} to favorites`,
        "aria-pressed": String(favorite),
      },
    });
    favoriteButton.dataset.favorite = String(favorite);
    setIcon(favoriteButton, "star");
    favoriteButton.addEventListener("click", () => {
      this.controller.toggleFavorite(file.path);
      this.renderVaultGrid();
    });
  }
}
