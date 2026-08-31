import { Notice, Plugin, TFile, normalizePath } from "obsidian";
import {
  DEFAULT_SETTINGS,
  mediaKind,
  normalizeSettings,
  type MediaKind,
  type VeilSettings,
} from "./settings";
import { WallpaperSettingsTab } from "./settings-tab";

const BODY_CLASS = "vault-dashboard-background";
const LAYER_CLASS = "vault-dashboard-wallpaper";
const PANE_OPACITY_VARIABLE = "--vault-dashboard-pane-opacity";
const PANE_CONTENT_CLASS = "vault-dashboard-fade-pane-content";
const PANE_CONTENT_OPACITY_VARIABLE = "--vault-dashboard-pane-content-opacity";
const LEGACY_IMAGE_VARIABLE = "--vault-dashboard-banner-image";

interface WallpaperSource {
  path: string;
  url: string;
  kind: Exclude<MediaKind, "">;
  label: string;
  key: string;
}

interface DocumentState {
  key: string;
  kind: Exclude<MediaKind, "">;
  layer: HTMLDivElement;
  media: HTMLImageElement | HTMLVideoElement;
  vignette: HTMLDivElement;
  ready: boolean;
  failed: boolean;
  disposed: boolean;
  playPromise: Promise<void> | null;
  cleanups: Array<() => void>;
  motionQuery?: MediaQueryList;
}

type StatusTone = "info" | "success" | "error";

export default class VeilPlugin extends Plugin {
  public settings: VeilSettings = { ...DEFAULT_SETTINGS };
  public status: { message: string; tone: StatusTone } = {
    message: "Waiting for the workspace…",
    tone: "info",
  };

  private readonly documents = new Map<Document, DocumentState>();
  private currentSource: WallpaperSource | null = null;
  private settingTab: WallpaperSettingsTab | null = null;
  private unloaded = false;
  private layoutReady = false;
  private sourceRevision = 0;
  private saveTimer: number | null = null;
  private pendingSave = false;
  private saveQueue: Promise<void> = Promise.resolve();

  async onload(): Promise<void> {
    try {
      this.settings = normalizeSettings(await this.loadData(), normalizePath);
    } catch (error) {
      console.error("[veil] Could not load settings", error);
      new Notice("Veil settings could not be loaded. Using defaults.");
    }
    if (this.unloaded) return;

    this.settingTab = new WallpaperSettingsTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.addCommand({
      id: "reload-wallpaper",
      name: "Reload wallpaper",
      callback: () => this.refreshWallpaper(true),
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.unloaded) return;
      this.layoutReady = true;
      this.registerVaultEvents();
      this.refreshWallpaper();
    });
    this.registerEvent(
      this.app.workspace.on("window-open", (_workspaceWindow, window) => {
        this.applyToDocument(window.document);
      }),
    );
    this.registerEvent(
      this.app.workspace.on("window-close", (_workspaceWindow, window) => {
        this.clearDocument(window.document);
      }),
    );
    this.registerEvent(this.app.workspace.on("css-change", () => this.applyToWorkspace()));
  }

  onunload(): void {
    this.unloaded = true;
    void this.flushSettings();
    this.clearAllDocuments();
  }

  public updateSettings(patch: Partial<VeilSettings>): void {
    if (this.unloaded) return;
    this.settings = normalizeSettings({ ...this.settings, ...patch }, normalizePath);
    this.refreshWallpaper();
    this.pendingSave = true;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.flushSettings();
    }, 200);
  }

  public flushSettings(): Promise<void> {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.pendingSave) return this.saveQueue;

    this.pendingSave = false;
    const snapshot = { ...this.settings };
    const task = this.saveQueue.then(() => this.saveData(snapshot));
    this.saveQueue = task.catch((error: unknown) => {
      console.error("[veil] Could not save settings", error);
      new Notice("Veil changes could not be saved. Check vault permissions.");
    });
    return this.saveQueue;
  }

  public refreshWallpaper(force = false): void {
    if (this.unloaded || !this.layoutReady) return;
    if (!this.settings.enabled) {
      this.currentSource = null;
      this.clearAllDocuments();
      this.setStatus("Wallpaper is disabled.");
      return;
    }

    const path = this.settings.wallpaperPath;
    const invalidPath = /(^\/|^[a-z][a-z0-9+.-]*:|(^|\/)\.\.(\/|$))/i.test(path);
    const file = invalidPath ? null : this.app.vault.getAbstractFileByPath(path);
    const kind = file instanceof TFile ? mediaKind(file) : "";
    if (!path || !(file instanceof TFile) || !kind) {
      this.currentSource = null;
      this.clearAllDocuments();
      this.setStatus(
        !path
          ? "Choose a wallpaper file to begin."
          : invalidPath
            ? "Use a vault-relative path, not a URL or a path outside the vault."
            : !(file instanceof TFile)
              ? `File not found in this vault: ${path}`
              : `Unsupported wallpaper format: ${file.extension}`,
        path ? "error" : "info",
      );
      return;
    }

    if (force) this.sourceRevision += 1;
    const url = this.app.vault.getResourcePath(file);
    const nextSource: WallpaperSource = {
      path: file.path,
      url,
      kind,
      label:
        kind === "video"
          ? "Video"
          : file.extension.toLowerCase() === "gif"
            ? "Animated GIF"
            : "Image",
      key: [file.path, url, file.stat.mtime, file.stat.size, this.sourceRevision].join("|"),
    };
    const sourceChanged = this.currentSource?.key !== nextSource.key;
    this.currentSource = nextSource;
    if (sourceChanged) {
      this.setStatus(`Loading ${nextSource.label.toLowerCase()}: ${file.path}`);
    }
    this.applyToWorkspace();
  }

  private setStatus(message: string, tone: StatusTone = "info"): void {
    this.status = { message, tone };
    this.settingTab?.updateStatus();
  }

  private registerVaultEvents(): void {
    this.registerEvent(
      this.app.vault.on("create", (file) => this.refreshIfWallpaper(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => this.refreshIfWallpaper(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => this.refreshIfWallpaper(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const selected = this.settings.wallpaperPath;
        if (selected === oldPath || selected.startsWith(`${oldPath}/`)) {
          this.updateSettings({ wallpaperPath: file.path + selected.slice(oldPath.length) });
        }
      }),
    );
  }

  private refreshIfWallpaper(path: string): void {
    if (path === this.settings.wallpaperPath) this.refreshWallpaper(true);
  }

  private applyToWorkspace(): void {
    if (this.unloaded || !this.currentSource) return;
    const documents = new Set(this.documents.keys());
    documents.add(this.app.workspace.containerEl.ownerDocument);
    this.app.workspace.iterateAllLeaves((leaf) => {
      documents.add(leaf.view.containerEl.ownerDocument);
    });
    for (const document of documents) {
      if (document.defaultView?.closed) this.clearDocument(document);
      else this.applyToDocument(document);
    }
  }

  private applyOptions(document: Document, state: DocumentState): void {
    const filters: string[] = [];
    if (this.settings.blurEnabled && this.settings.blurIntensity > 0) {
      filters.push(`blur(${this.settings.blurIntensity}px)`);
    }
    if (this.settings.dimEnabled && this.settings.dimIntensity > 0) {
      filters.push(`brightness(${1 - this.settings.dimIntensity / 100})`);
    }
    const variables: Record<string, string> = {
      "--vdb-opacity": String(this.settings.opacity / 100),
      "--vdb-fit": this.settings.displayMode,
      "--vdb-filter": filters.length ? filters.join(" ") : "none",
      "--vdb-blur-bleed": `${this.settings.blurEnabled ? this.settings.blurIntensity * 2 : 0}px`,
      "--vdb-vignette-shape": this.settings.vignetteMode === "circle" ? "circle" : "ellipse",
      "--vdb-vignette-intensity": String(this.settings.vignetteIntensity / 100),
      "--vdb-vignette-radius": `${this.settings.vignetteRadius}%`,
    };
    for (const [name, value] of Object.entries(variables)) {
      if (state.layer.style.getPropertyValue(name) !== value) {
        state.layer.style.setProperty(name, value);
      }
    }

    state.vignette.hidden =
      this.settings.vignetteMode === "off" || this.settings.vignetteIntensity === 0;
    if (!state.failed) {
      document.body.style.setProperty(PANE_OPACITY_VARIABLE, `${this.settings.paneOpacity}%`);
    }
    const fadePaneContent = !state.failed && this.settings.paneContentOpacity < 100;
    document.body.classList.toggle(PANE_CONTENT_CLASS, fadePaneContent);
    if (fadePaneContent) {
      document.body.style.setProperty(
        PANE_CONTENT_OPACITY_VARIABLE,
        String(this.settings.paneContentOpacity / 100),
      );
    } else {
      document.body.style.removeProperty(PANE_CONTENT_OPACITY_VARIABLE);
    }
    document.body.style.removeProperty(LEGACY_IMAGE_VARIABLE);
    if (state.ready && !state.failed) document.body.classList.add(BODY_CLASS);
    this.syncVideoPlayback(document, state);
  }

  private applyToDocument(document: Document): void {
    if (
      this.unloaded ||
      !this.currentSource ||
      !document.body ||
      document.body.classList.contains("is-mobile")
    ) {
      return;
    }
    let state = this.documents.get(document);
    if (state?.key === this.currentSource.key && state.layer.isConnected) {
      this.applyOptions(document, state);
      return;
    }
    if (state) this.clearDocument(document);

    const source = this.currentSource;
    const layer = document.body.createDiv();
    layer.className = LAYER_CLASS;
    layer.hidden = true;
    layer.setAttribute("aria-hidden", "true");

    const media: HTMLImageElement | HTMLVideoElement =
      source.kind === "video" ? layer.createEl("video") : layer.createEl("img");
    media.className = "vault-dashboard-wallpaper-media";
    media.setAttribute("aria-hidden", "true");
    media.setAttribute("tabindex", "-1");
    if (source.kind === "video") {
      const video = media as HTMLVideoElement;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.controls = false;
      video.disablePictureInPicture = true;
    } else {
      const image = media as HTMLImageElement;
      image.alt = "";
      image.draggable = false;
      image.decoding = "async";
    }

    const vignette = layer.createDiv();
    vignette.className = "vault-dashboard-wallpaper-vignette";

    state = {
      key: source.key,
      kind: source.kind,
      layer,
      media,
      vignette,
      ready: false,
      failed: false,
      disposed: false,
      playPromise: null,
      cleanups: [],
      motionQuery: document.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)"),
    };
    const activeState = state;
    const listen = (target: EventTarget, event: string, callback: EventListener): void => {
      target.addEventListener(event, callback);
      activeState.cleanups.push(() => target.removeEventListener(event, callback));
    };
    const isCurrent = (): boolean =>
      !this.unloaded &&
      !activeState.disposed &&
      this.documents.get(document) === activeState;
    const ready = (): void => {
      if (!isCurrent()) return;
      activeState.ready = true;
      layer.hidden = false;
      this.applyOptions(document, activeState);
      this.setStatus(`${source.label} loaded: ${source.path}`, "success");
    };
    listen(media, source.kind === "video" ? "loadeddata" : "load", ready);
    listen(media, "error", () => {
      if (!isCurrent()) return;
      activeState.failed = true;
      layer.hidden = true;
      if (activeState.kind === "video") {
        (media as HTMLVideoElement).pause();
      }
      this.restoreDocumentStyles(document);
      this.setStatus(
        `Could not load ${source.path}${
          source.kind === "video"
            ? ". Check the video codec or try MP4/WebM."
            : ". Check that the image is readable."
        }`,
        "error",
      );
    });
    listen(document, "visibilitychange", () => this.syncVideoPlayback(document, activeState));
    if (activeState.motionQuery?.addEventListener) {
      listen(activeState.motionQuery, "change", () =>
        this.syncVideoPlayback(document, activeState),
      );
    }

    this.documents.set(document, activeState);
    document.body.prepend(layer);
    this.applyOptions(document, activeState);
    media.src = source.url;
    if (activeState.kind === "video") {
      (media as HTMLVideoElement).load();
      this.syncVideoPlayback(document, activeState);
    } else {
      const image = media as HTMLImageElement;
      if (image.complete && image.naturalWidth > 0) ready();
    }
  }

  private syncVideoPlayback(document: Document, state: DocumentState): void {
    if (state.kind !== "video" || state.disposed || state.failed || this.unloaded) return;
    const video = state.media as HTMLVideoElement;
    const shouldPlay =
      this.settings.enabled &&
      this.settings.opacity > 0 &&
      !(this.settings.pauseWhenHidden && document.hidden) &&
      !(this.settings.respectReducedMotion && state.motionQuery?.matches);
    if (!shouldPlay) {
      video.pause();
      return;
    }
    if (!video.paused || state.playPromise || !video.getAttribute("src")) return;

    try {
      let interrupted = false;
      state.playPromise = Promise.resolve(video.play())
        .catch((error: unknown) => {
          if (state.disposed || this.unloaded) return;
          if (error instanceof DOMException && error.name === "AbortError") {
            interrupted = true;
            return;
          }
          this.setStatus(
            "Video could not autoplay. Use Reload wallpaper to retry, or check the video codec.",
            "error",
          );
        })
        .finally(() => {
          state.playPromise = null;
          if (interrupted) this.syncVideoPlayback(document, state);
        });
    } catch {
      this.setStatus("Video playback is unavailable in this window.", "error");
    }
  }

  private clearDocument(document: Document): void {
    const state = this.documents.get(document);
    if (state) {
      state.disposed = true;
      for (const cleanup of state.cleanups) cleanup();
      if (state.kind === "video") {
        const video = state.media as HTMLVideoElement;
        video.pause();
        video.removeAttribute("src");
        video.load();
      } else {
        state.media.removeAttribute("src");
      }
      state.layer.remove();
      this.documents.delete(document);
    }
    this.restoreDocumentStyles(document);
  }

  private restoreDocumentStyles(document: Document): void {
    document.body?.classList.remove(BODY_CLASS, PANE_CONTENT_CLASS);
    document.body?.style.removeProperty(PANE_OPACITY_VARIABLE);
    document.body?.style.removeProperty(PANE_CONTENT_OPACITY_VARIABLE);
    document.body?.style.removeProperty(LEGACY_IMAGE_VARIABLE);
  }

  private clearAllDocuments(): void {
    for (const document of Array.from(this.documents.keys())) this.clearDocument(document);
  }
}
