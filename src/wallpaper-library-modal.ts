import { Modal, TFile, setIcon, type App } from "obsidian";
import { randomVisibleWallpaper } from "./wallpaper-library-random";
import { mediaKind, type MediaKind } from "./settings";
import type { WallpaperLibraryState } from "./wallpaper-library-state";
import type { WallpaperLibraryTarget } from "./wallpaper-library-targets";

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

export class WallpaperLibraryModal extends Modal {
  private readonly controller: WallpaperLibraryController;
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
      text: "Browse vault-local wallpaper media. Images load lazily; videos stay as lightweight placeholders until selected as the wallpaper.",
    });

    this.files = this.app.vault.getFiles()
      .filter((file) => Boolean(mediaKind(file)))
      .sort((left, right) => left.path.localeCompare(right.path));

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
      this.renderGrid();
    });

    const toolbar = this.contentEl.createDiv({ cls: "veil-wallpaper-library-toolbar" });
    const search = toolbar.createEl("input", {
      cls: "veil-wallpaper-library-search",
      attr: {
        type: "search",
        placeholder: "Search wallpaper paths…",
        "aria-label": "Search wallpaper library",
      },
    });
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLowerCase();
      this.resetVisibleLimit();
    });

    const filters = toolbar.createDiv({ cls: "veil-wallpaper-library-filters" });
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
        this.renderGrid();
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

    this.summaryEl = this.contentEl.createDiv({ cls: "veil-wallpaper-library-summary" });
    this.gridEl = this.contentEl.createDiv({ cls: "veil-wallpaper-library-grid" });
    this.moreEl = this.contentEl.createDiv({ cls: "veil-wallpaper-library-more" });
    this.updateFilterButtons();
    this.renderGrid();
    search.focus();
  }

  onClose(): void {
    this.files = [];
    this.filterButtons.clear();
    this.gridEl = null;
    this.summaryEl = null;
    this.moreEl = null;
    this.contentEl.empty();
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
    this.renderGrid();
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
    this.renderGrid();
  }

  private renderGrid(): void {
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
        this.renderGrid();
      });
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
    const preview = select.createDiv({ cls: "veil-wallpaper-library-preview" });
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
      this.renderGrid();
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
      this.renderGrid();
    });
  }
}
