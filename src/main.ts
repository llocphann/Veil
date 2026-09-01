import {
  Notice,
  Plugin,
  TFile,
  getAllTags,
  normalizePath,
  type WorkspaceLeaf,
} from "obsidian";
import {
  matchingOpacityExclusions,
  type NoteContext,
} from "./context-rules";
import { resolveWallpaper } from "./profile-resolver";
import {
  DEFAULT_SETTINGS,
  mediaKind,
  normalizeSettings,
  type MediaKind,
  type VeilAppearance,
  type VeilSettings,
} from "./settings";
import { WallpaperSettingsTab } from "./settings-tab";

const BODY_CLASS = "vault-dashboard-background";
const LAYER_CLASS = "vault-dashboard-wallpaper";
const PANE_OPACITY_VARIABLE = "--vault-dashboard-pane-opacity";
const PANE_CONTENT_CLASS = "vault-dashboard-fade-pane-content";
const PANE_CONTENT_OPACITY_VARIABLE = "--vault-dashboard-pane-content-opacity";
const LEGACY_IMAGE_VARIABLE = "--vault-dashboard-banner-image";
const TRANSITION_OPACITY_VARIABLE = "--vdb-transition-opacity";
const TRANSITION_CLEANUP_BUFFER = 80;

interface WallpaperSource {
  path: string;
  url: string;
  kind: Exclude<MediaKind, "">;
  label: string;
  key: string;
  contextLabel: string;
  appearance: VeilAppearance;
}

interface DocumentState {
  key: string;
  kind: Exclude<MediaKind, "">;
  layer: HTMLDivElement;
  media: HTMLImageElement | HTMLVideoElement;
  vignette: HTMLDivElement;
  appearance: VeilAppearance;
  ready: boolean;
  failed: boolean;
  disposed: boolean;
  playPromise: Promise<void> | null;
  transitionTimer: number | null;
  outgoing: DocumentState | null;
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
  private settingTab: WallpaperSettingsTab | null = null;
  private unloaded = false;
  private layoutReady = false;
  private sourceRevision = 0;
  private saveTimer: number | null = null;
  private pendingSave = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private refreshFrame: number | null = null;

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
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refreshWallpaper()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshWallpaper()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.refreshWallpaper()));
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.isActiveFile(file)) this.refreshWallpaper();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("window-open", (_workspaceWindow, window) => {
        if (this.layoutReady) this.applyToDocument(window.document);
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
    if (this.refreshFrame !== null) window.cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = null;
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
    const snapshot = normalizeSettings(this.settings, normalizePath);
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
      if (this.refreshFrame !== null) window.cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
      this.clearAllDocuments();
      this.setStatus("Wallpaper is disabled.");
      return;
    }
    if (force) this.sourceRevision += 1;
    this.scheduleApplyToWorkspace();
  }

  public activeContextSummary(): string {
    const document = this.app.workspace.containerEl.ownerDocument;
    const context = this.contextForDocument(document);
    const resolved = resolveWallpaper(this.settings, context);
    if (!context) return "No active note context in the main window.";
    if (resolved.profile) {
      return `${context.path} → ${resolved.profile.name} (${resolved.rule?.matchType || "rule"})`;
    }
    if (resolved.rule) {
      return `${context.path} → inline wallpaper rule (${resolved.rule.matchType}: ${resolved.rule.matchValue})`;
    }
    return `${context.path} → default appearance`;
  }

  private scheduleApplyToWorkspace(): void {
    if (this.refreshFrame !== null || this.unloaded) return;
    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.applyToWorkspace();
    });
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
        const rename = (value: string): string =>
          value === oldPath || value.startsWith(`${oldPath}/`)
            ? file.path + value.slice(oldPath.length)
            : value;
        const next = normalizeSettings(this.settings, normalizePath);
        let changed = false;
        const wallpaperPath = rename(next.wallpaperPath);
        if (wallpaperPath !== next.wallpaperPath) {
          next.wallpaperPath = wallpaperPath;
          changed = true;
        }
        for (const profile of next.profiles) {
          const path = rename(profile.wallpaperPath);
          if (path !== profile.wallpaperPath) {
            profile.wallpaperPath = path;
            changed = true;
          }
        }
        for (const rule of next.wallpaperRules) {
          const path = rename(rule.wallpaperPath);
          if (path !== rule.wallpaperPath) {
            rule.wallpaperPath = path;
            changed = true;
          }
          if (rule.matchType === "path" || rule.matchType === "folder") {
            const matchValue = rename(rule.matchValue);
            if (matchValue !== rule.matchValue) {
              rule.matchValue = matchValue;
              changed = true;
            }
          }
        }
        for (const rule of next.opacityExclusions) {
          if (rule.matchType !== "path" && rule.matchType !== "folder") continue;
          const matchValue = rename(rule.matchValue);
          if (matchValue !== rule.matchValue) {
            rule.matchValue = matchValue;
            changed = true;
          }
        }
        if (changed) this.updateSettings(next);
        else this.refreshWallpaper();
      }),
    );
  }

  private refreshIfWallpaper(path: string): void {
    const selectedPaths = [
      this.settings.wallpaperPath,
      ...this.settings.profiles.map((profile) => profile.wallpaperPath),
      ...this.settings.wallpaperRules.map((rule) => rule.wallpaperPath),
    ];
    if (selectedPaths.includes(path)) this.refreshWallpaper(true);
  }

  private applyToWorkspace(): void {
    if (this.unloaded) return;
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

  private applyOptions(
    document: Document,
    state: DocumentState,
    context: NoteContext | null,
    appearanceOverride?: VeilAppearance,
  ): void {
    const resolved = appearanceOverride ? null : resolveWallpaper(this.settings, context);
    const appearance = appearanceOverride || resolved?.appearance || state.appearance;
    state.appearance = appearance;
    const filters: string[] = [];
    if (appearance.blurEnabled && appearance.blurIntensity > 0) {
      filters.push(`blur(${appearance.blurIntensity}px)`);
    }
    if (appearance.dimEnabled && appearance.dimIntensity > 0) {
      filters.push(`brightness(${1 - appearance.dimIntensity / 100})`);
    }
    const effectStrength = appearance.effectIntensity / 100;
    if (appearance.effectPreset === "retro" && effectStrength > 0) {
      filters.push(
        `sepia(${(effectStrength * 0.72).toFixed(2)})`,
        `saturate(${(1 + effectStrength * 0.5).toFixed(2)})`,
        `contrast(${(1 + effectStrength * 0.14).toFixed(2)})`,
      );
    }
    const effectBleed = appearance.effectPreset === "glitch" ? 8 : 0;
    const mediaScale = appearance.wallpaperZoom / 100;
    const variables: Record<string, string> = {
      "--vdb-opacity": String(appearance.opacity / 100),
      "--vdb-fit": appearance.displayMode,
      "--vdb-position-x": `${appearance.wallpaperPositionX}%`,
      "--vdb-position-y": `${appearance.wallpaperPositionY}%`,
      "--vdb-media-scale": String(mediaScale),
      "--vdb-glitch-scale": String(mediaScale * 1.01),
      "--vdb-transition-duration": `${appearance.transitionDuration}ms`,
      "--vdb-filter": filters.length ? filters.join(" ") : "none",
      "--vdb-blur-bleed": `${
        (appearance.blurEnabled ? appearance.blurIntensity * 2 : 0) + effectBleed
      }px`,
      "--vdb-vignette-shape": appearance.vignetteMode === "circle" ? "circle" : "ellipse",
      "--vdb-vignette-intensity": String(appearance.vignetteIntensity / 100),
      "--vdb-vignette-radius": `${appearance.vignetteRadius}%`,
      "--vdb-overlay-color": appearance.colorOverlayColor,
      "--vdb-overlay-opacity": String(appearance.colorOverlayOpacity / 100),
      "--vdb-overlay-blend-mode": appearance.colorOverlayBlendMode,
      "--vdb-effect-opacity": String(0.08 + effectStrength * 0.42),
      "--vdb-effect-shift": `${Math.max(1, Math.round(effectStrength * 7))}px`,
      "--vdb-effect-speed": `${Math.max(90, Math.round(420 - effectStrength * 300))}ms`,
    };
    for (const [name, value] of Object.entries(variables)) {
      if (state.layer.style.getPropertyValue(name) !== value) {
        state.layer.style.setProperty(name, value);
      }
    }

    state.layer.dataset.colorOverlay = String(
      appearance.colorOverlayEnabled && appearance.colorOverlayOpacity > 0,
    );
    state.layer.dataset.effect = appearance.effectIntensity > 0
      ? appearance.effectPreset
      : "none";
    state.layer.dataset.reduceMotion = String(appearance.respectReducedMotion);
    const profile = resolved?.profile || null;
    if (profile) state.layer.dataset.profileId = profile.id;
    else if (!appearanceOverride) delete state.layer.dataset.profileId;

    state.vignette.hidden =
      appearance.vignetteMode === "off" || appearance.vignetteIntensity === 0;
    const exclusions = matchingOpacityExclusions(this.settings.opacityExclusions, context);
    const paneOpacity = exclusions.paneSurface ? 100 : appearance.paneOpacity;
    const paneContentOpacity = exclusions.paneContent ? 100 : appearance.paneContentOpacity;
    if (!state.failed) document.body.style.setProperty(PANE_OPACITY_VARIABLE, `${paneOpacity}%`);
    const fadePaneContent = !state.failed && paneContentOpacity < 100;
    document.body.classList.toggle(PANE_CONTENT_CLASS, fadePaneContent);
    if (fadePaneContent) {
      document.body.style.setProperty(
        PANE_CONTENT_OPACITY_VARIABLE,
        String(paneContentOpacity / 100),
      );
    } else {
      document.body.style.removeProperty(PANE_CONTENT_OPACITY_VARIABLE);
    }
    document.body.style.removeProperty(LEGACY_IMAGE_VARIABLE);
    if (state.ready && !state.failed) document.body.classList.add(BODY_CLASS);
    this.syncPlaybackAndMotion(document, state);
  }

  private applyToDocument(document: Document): void {
    if (
      this.unloaded ||
      !this.settings.enabled ||
      !document.body ||
      document.body.classList.contains("is-mobile")
    ) {
      this.clearDocument(document);
      return;
    }
    const context = this.contextForDocument(document);
    const source = this.sourceForDocument(document, context);
    if (!source) {
      this.clearDocument(document);
      return;
    }
    let previous = this.documents.get(document) || null;
    if (previous?.key === source.key && previous.layer.isConnected) {
      this.applyOptions(document, previous, context, source.appearance);
      this.setDocumentStatus(document, `${source.contextLabel} · ${source.label}: ${source.path}`, "success");
      return;
    }

    if (previous && (!previous.ready || previous.failed || !previous.layer.isConnected)) {
      this.documents.delete(document);
      this.disposeState(previous);
      previous = null;
    } else if (previous) {
      this.settleState(previous);
    }

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

    const state: DocumentState = {
      key: source.key,
      kind: source.kind,
      layer,
      media,
      vignette,
      appearance: source.appearance,
      ready: false,
      failed: false,
      disposed: false,
      playPromise: null,
      transitionTimer: null,
      outgoing: previous,
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
      this.applyOptions(document, activeState, this.contextForDocument(document));
      this.startCrossfade(document, activeState);
      this.setDocumentStatus(
        document,
        `${source.contextLabel} · ${source.label} loaded: ${source.path}`,
        "success",
      );
    };
    listen(media, source.kind === "video" ? "loadeddata" : "load", ready);
    listen(media, "error", () => {
      if (!isCurrent()) return;
      activeState.failed = true;
      layer.hidden = true;
      if (activeState.kind === "video") {
        (media as HTMLVideoElement).pause();
      }
      const fallback = activeState.outgoing;
      activeState.outgoing = null;
      this.documents.delete(document);
      this.disposeState(activeState);
      if (fallback && !fallback.disposed && fallback.layer.isConnected) {
        this.settleState(fallback);
        this.documents.set(document, fallback);
        this.applyOptions(document, fallback, this.contextForDocument(document), fallback.appearance);
      } else {
        this.restoreDocumentStyles(document);
      }
      this.setDocumentStatus(
        document,
        `Could not load ${source.path}${
          source.kind === "video"
            ? ". Check the video codec or try MP4/WebM."
            : ". Check that the image is readable."
        }`,
        "error",
      );
    });
    listen(document, "visibilitychange", () => this.syncPlaybackAndMotion(document, activeState));
    if (activeState.motionQuery?.addEventListener) {
      listen(activeState.motionQuery, "change", () =>
        this.syncPlaybackAndMotion(document, activeState),
      );
    }

    this.documents.set(document, activeState);
    document.body.prepend(layer);
    this.applyOptions(document, activeState, context, source.appearance);
    media.src = source.url;
    if (activeState.kind === "video") {
      (media as HTMLVideoElement).load();
      this.syncPlaybackAndMotion(document, activeState);
    } else {
      const image = media as HTMLImageElement;
      if (image.complete && image.naturalWidth > 0) ready();
    }
  }

  private startCrossfade(document: Document, state: DocumentState): void {
    const outgoing = state.outgoing;
    if (!outgoing || outgoing.disposed || !outgoing.ready || outgoing.failed) {
      if (outgoing) this.disposeState(outgoing);
      state.outgoing = null;
      state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
      delete state.layer.dataset.transitionState;
      return;
    }

    const reducedMotion =
      state.appearance.respectReducedMotion && Boolean(state.motionQuery?.matches);
    const duration = reducedMotion ? 0 : state.appearance.transitionDuration;
    if (duration <= 0) {
      this.disposeState(outgoing);
      state.outgoing = null;
      state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
      delete state.layer.dataset.transitionState;
      return;
    }

    const durationValue = `${duration}ms`;
    state.layer.style.setProperty("--vdb-transition-duration", durationValue);
    outgoing.layer.style.setProperty("--vdb-transition-duration", durationValue);
    state.layer.dataset.transitionState = "incoming";
    outgoing.layer.dataset.transitionState = "outgoing";
    state.layer.setCssProps({ [TRANSITION_OPACITY_VARIABLE]: "0" });
    outgoing.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
    void state.layer.offsetWidth;

    window.requestAnimationFrame(() => {
      if (state.disposed || outgoing.disposed || this.documents.get(document) !== state) return;
      state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
      outgoing.layer.setCssProps({ [TRANSITION_OPACITY_VARIABLE]: "0" });
    });

    state.transitionTimer = window.setTimeout(() => {
      state.transitionTimer = null;
      if (state.outgoing !== outgoing) return;
      this.disposeState(outgoing);
      state.outgoing = null;
      delete state.layer.dataset.transitionState;
    }, duration + TRANSITION_CLEANUP_BUFFER);
  }

  private settleState(state: DocumentState): void {
    if (state.transitionTimer !== null) {
      window.clearTimeout(state.transitionTimer);
      state.transitionTimer = null;
    }
    if (state.outgoing) {
      this.disposeState(state.outgoing);
      state.outgoing = null;
    }
    state.layer.style.removeProperty(TRANSITION_OPACITY_VARIABLE);
    delete state.layer.dataset.transitionState;
  }

  private syncPlaybackAndMotion(document: Document, state: DocumentState): void {
    const appearance = state.appearance;
    const motionPaused =
      appearance.opacity === 0
      || (appearance.pauseWhenHidden && document.hidden)
      || (appearance.respectReducedMotion && Boolean(state.motionQuery?.matches));
    state.layer.dataset.animationPaused = String(motionPaused);
    if (state.kind !== "video" || state.disposed || state.failed || this.unloaded) return;
    const video = state.media as HTMLVideoElement;
    const shouldPlay =
      this.settings.enabled &&
      appearance.opacity > 0 &&
      !motionPaused;
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
          if (interrupted) this.syncPlaybackAndMotion(document, state);
        });
    } catch {
      this.setStatus("Video playback is unavailable in this window.", "error");
    }
  }

  private disposeState(state: DocumentState): void {
    if (state.disposed) return;
    state.disposed = true;
    if (state.transitionTimer !== null) {
      window.clearTimeout(state.transitionTimer);
      state.transitionTimer = null;
    }
    if (state.outgoing) {
      this.disposeState(state.outgoing);
      state.outgoing = null;
    }
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
  }

  private clearDocument(document: Document): void {
    const state = this.documents.get(document);
    if (state) {
      this.documents.delete(document);
      this.disposeState(state);
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

  private sourceForDocument(
    document: Document,
    context: NoteContext | null,
  ): WallpaperSource | null {
    const resolved = resolveWallpaper(this.settings, context);
    const path = resolved.path;
    const invalidPath = /(^\/|^[a-z][a-z0-9+.-]*:|(^|\/)\.\.(\/|$))/i.test(path);
    const file = invalidPath ? null : this.app.vault.getAbstractFileByPath(path);
    const kind = file instanceof TFile ? mediaKind(file) : "";
    const contextLabel = resolved.profile
      ? `Scene “${resolved.profile.name}”`
      : resolved.rule
        ? `Rule ${resolved.rule.matchType}: ${resolved.rule.matchValue}`
        : "Default appearance";
    if (!path || !(file instanceof TFile) || !kind) {
      const rulePrefix = resolved.rule ? `${contextLabel}: ` : "";
      this.setDocumentStatus(
        document,
        !path
          ? resolved.rule
            ? resolved.profile
              ? `${rulePrefix}choose a wallpaper file for this scene.`
              : `${rulePrefix}choose a wallpaper file for this rule.`
            : "Choose a wallpaper file to begin."
          : invalidPath
            ? "Use a vault-relative path, not a URL or a path outside the vault."
            : !(file instanceof TFile)
              ? `${rulePrefix}file not found in this vault: ${path}`
              : `${rulePrefix}unsupported wallpaper format: ${file.extension}`,
        path || resolved.rule ? "error" : "info",
      );
      return null;
    }

    const url = this.app.vault.getResourcePath(file);
    const contextKey = resolved.profile
      ? `profile:${resolved.profile.id}`
      : resolved.rule
        ? `rule:${resolved.rule.id}`
        : "default";
    const source: WallpaperSource = {
      path: file.path,
      url,
      kind,
      label:
        kind === "video"
          ? "Video"
          : file.extension.toLowerCase() === "gif"
            ? "Animated GIF"
            : "Image",
      key: [
        file.path,
        url,
        file.stat.mtime,
        file.stat.size,
        contextKey,
        this.sourceRevision,
      ].join("|"),
      contextLabel,
      appearance: resolved.appearance,
    };
    if (this.documents.get(document)?.key !== source.key) {
      this.setDocumentStatus(
        document,
        `${contextLabel} · loading ${source.label.toLowerCase()}: ${file.path}`,
      );
    }
    return source;
  }

  private contextForDocument(document: Document): NoteContext | null {
    const leaf = this.leafForDocument(document);
    const candidate: unknown = (leaf?.view as { file?: unknown } | undefined)?.file;
    if (!(candidate instanceof TFile)) return null;
    const cache = this.app.metadataCache.getFileCache(candidate);
    return {
      path: candidate.path,
      name: candidate.name,
      basename: candidate.basename,
      tags: cache ? getAllTags(cache) || [] : [],
    };
  }

  private leafForDocument(document: Document): WorkspaceLeaf | null {
    const recent = this.app.workspace.getMostRecentLeaf();
    if (this.isRootLeafForDocument(recent, document)) return recent;
    let result: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!result && this.isRootLeafForDocument(leaf, document)) result = leaf;
    });
    return result;
  }

  private isRootLeafForDocument(leaf: WorkspaceLeaf | null, document: Document): boolean {
    const container = leaf?.view?.containerEl;
    return container?.ownerDocument === document
      && Boolean(container.closest(".workspace-split.mod-root"));
  }

  private isActiveFile(file: TFile): boolean {
    const documents = new Set<Document>([this.app.workspace.containerEl.ownerDocument]);
    this.app.workspace.iterateAllLeaves((leaf) => documents.add(leaf.view.containerEl.ownerDocument));
    for (const document of documents) {
      if (this.contextForDocument(document)?.path === file.path) return true;
    }
    return false;
  }

  private setDocumentStatus(
    document: Document,
    message: string,
    tone: StatusTone = "info",
  ): void {
    if (document === this.app.workspace.containerEl.ownerDocument) this.setStatus(message, tone);
  }
}