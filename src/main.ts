import {
  Notice,
  Plugin,
  TFile,
  normalizePath,
} from "obsidian";
import {
  matchingOpacityExclusions,
  type NoteContext,
} from "./context-rules";
import { DocumentContextResolver } from "./document-context-resolver";
import { SceneRuntime } from "./scene-runtime";
import { SceneSwitcherModal } from "./scene-switcher-modal";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type MediaKind,
  type VeilAppearance,
  type VeilSettings,
} from "./settings";
import { SettingsPersistence } from "./settings-persistence";
import { SystemRoutingScheduler } from "./system-routing-scheduler";
import {
  retainedOutgoingForPending,
  shouldRetainWallpaperForUnavailableSource,
  workingWallpaperFallback,
} from "./transition-lifecycle";
import { rewriteSettingsForVaultRename } from "./vault-settings-rename";
import { WallpaperLibraryModal } from "./wallpaper-library-modal";
import { WallpaperLibraryRuntime } from "./wallpaper-library-runtime";
import {
  wallpaperLibraryTargetPatch,
  wallpaperLibraryTargets,
} from "./wallpaper-library-targets";
import { WallpaperPoolRuntime } from "./wallpaper-pool-runtime";
import { WallpaperSourceResolver } from "./wallpaper-source-resolver";
import { WallpaperSettingsTab } from "./settings-tab";

const BODY_CLASS = "vault-dashboard-background";
const LAYER_CLASS = "vault-dashboard-wallpaper";
const PANE_OPACITY_VARIABLE = "--vault-dashboard-pane-opacity";
const PANE_CONTENT_CLASS = "vault-dashboard-fade-pane-content";
const PANE_CONTENT_OPACITY_VARIABLE = "--vault-dashboard-pane-content-opacity";
const LEGACY_IMAGE_VARIABLE = "--vault-dashboard-banner-image";
const TRANSITION_OPACITY_VARIABLE = "--vdb-transition-opacity";
const TRANSITION_CLEANUP_BUFFER = 80;

interface DocumentState {
  key: string;
  path: string;
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
  private readonly documentContexts = new DocumentContextResolver(this.app);
  private readonly scenes = new SceneRuntime();
  private readonly wallpaperPools = new WallpaperPoolRuntime(this.app);
  private readonly wallpaperSources = new WallpaperSourceResolver(
    this.app,
    this.scenes,
    this.wallpaperPools,
    () => this.settings,
  );
  private readonly wallpaperLibrary = new WallpaperLibraryRuntime();
  private readonly settingsPersistence = new SettingsPersistence(
    () => this.settings,
    () => this.wallpaperLibrary.getState(),
    (data) => this.saveData(data),
    (error) => {
      console.error("[veil] Could not save settings", error);
      new Notice("Veil changes could not be saved. Check vault permissions.");
    },
  );
  private readonly systemRouting = new SystemRoutingScheduler(
    () => this.settings,
    () => !this.unloaded && this.layoutReady,
    () => this.refreshWallpaper(),
  );
  private settingTab: WallpaperSettingsTab | null = null;
  private unloaded = false;
  private layoutReady = false;
  private sourceRevision = 0;
  private refreshFrame: number | null = null;

  async onload(): Promise<void> {
    try {
      const storedData: unknown = await this.loadData();
      this.settings = normalizeSettings(storedData, normalizePath);
      const libraryData = typeof storedData === "object" && storedData !== null
        ? (storedData as Record<string, unknown>).wallpaperLibrary
        : null;
      this.wallpaperLibrary.load(libraryData);
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
    this.addCommand({
      id: "shuffle-wallpaper-pool",
      name: "Shuffle wallpaper pool",
      callback: () => this.shuffleWallpaperPool(),
    });
    this.addCommand({
      id: "open-wallpaper-library",
      name: "Open wallpaper library",
      callback: () => this.openWallpaperLibrary(),
    });
    this.addCommand({
      id: "switch-scene",
      name: "Switch scene",
      callback: () => this.openSceneSwitcher(),
    });

    this.app.workspace.onLayoutReady(() => {
      if (this.unloaded) return;
      this.layoutReady = true;
      this.documentContexts.rememberActiveRootLeaf(this.app.workspace.getMostRecentLeaf());
      this.registerVaultEvents();
      this.systemRouting.reschedule();
      this.refreshWallpaper();
    });
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.documentContexts.rememberActiveRootLeaf(leaf);
      this.refreshWallpaper();
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshWallpaper()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.refreshWallpaper()));
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (!this.layoutReady) return;
        if (this.documentContexts.isActiveFile(file)) this.refreshWallpaper();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("window-open", (_workspaceWindow, window) => {
        if (this.layoutReady) this.applyToDocument(window.document);
      }),
    );
    this.registerEvent(
      this.app.workspace.on("window-close", (_workspaceWindow, window) => {
        this.documentContexts.forgetDocument(window.document);
        this.clearDocument(window.document);
      }),
    );
    this.registerEvent(this.app.workspace.on("css-change", () => this.refreshWallpaper()));
  }

  onunload(): void {
    this.unloaded = true;
    if (this.refreshFrame !== null) window.cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = null;
    this.systemRouting.clear();
    void this.flushSettings();
    this.clearAllDocuments();
    this.documentContexts.clear();
    this.wallpaperPools.clear();
  }

  public updateSettings(
    patch: Partial<VeilSettings>,
    rememberRecent = true,
    preservedPoolContexts: readonly string[] = [],
  ): void {
    if (this.unloaded) return;
    const previous = this.settings;
    const next = normalizeSettings({ ...previous, ...patch }, normalizePath);
    if (rememberRecent) this.wallpaperLibrary.rememberSettingsChanges(previous, next);
    this.settings = next;
    this.scenes.reconcileSettings(next);
    this.wallpaperPools.reconcileSettings(previous, next, preservedPoolContexts);
    this.systemRouting.reschedule();
    this.refreshWallpaper();
    this.scheduleSave();
  }

  public flushSettings(): Promise<void> {
    return this.settingsPersistence.flush();
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

  public shuffleWallpaperPool(): void {
    const document = this.app.workspace.containerEl.ownerDocument;
    const context = this.documentContexts.contextForDocument(document);
    const resolved = this.scenes.resolve(this.settings, context);
    const poolAllowed = !resolved.rule || Boolean(resolved.profile);
    if (!poolAllowed || !resolved.appearance.wallpaperPoolEnabled) {
      new Notice("The current appearance is not using a wallpaper pool.");
      return;
    }

    const contextKey = this.contextKey(resolved.rule?.id || "", resolved.profile?.id || "");
    this.wallpaperPools.shuffle(resolved.appearance, contextKey);
    this.sourceRevision += 1;
    this.scheduleApplyToWorkspace();
  }

  public openWallpaperLibrary(): void {
    new WallpaperLibraryModal(this.app, {
      getTargets: () => wallpaperLibraryTargets(this.settings),
      getState: () => this.wallpaperLibrary.getState(),
      selectWallpaper: (targetId, path) => {
        const patch = wallpaperLibraryTargetPatch(this.settings, targetId, path);
        if (patch) this.updateSettings(patch);
      },
      toggleFavorite: (path) => {
        this.wallpaperLibrary.toggleFavorite(path);
        this.scheduleSave();
      },
    }).open();
  }

  public openSceneSwitcher(): void {
    new SceneSwitcherModal(this.app, {
      getProfiles: () => this.settings.profiles,
      getActiveOverrideId: () => this.scenes.getManualProfileId(),
      choose: (profileId) => this.setManualScene(profileId),
    }).open();
  }

  public activeContextSummary(): string {
    const document = this.app.workspace.containerEl.ownerDocument;
    const context = this.documentContexts.contextForDocument(document);
    return this.scenes.summary(this.settings, context);
  }

  private setManualScene(profileId: string): void {
    const change = this.scenes.setManualProfile(profileId, this.settings);
    if (change.kind === "missing") {
      new Notice("That veil scene no longer exists.");
      return;
    }
    if (change.kind === "unchanged") return;

    this.sourceRevision += 1;
    this.scheduleApplyToWorkspace();
    this.settingTab?.updateStatus();
    if (change.kind === "cleared") {
      new Notice("Veil is following context rules again.");
      return;
    }
    new Notice(`Veil scene: ${change.profile.name}`);
  }

  private scheduleSave(): void {
    if (this.unloaded) return;
    this.settingsPersistence.schedule();
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
      this.app.vault.on("create", (file) => {
        this.wallpaperPools.invalidateVaultEvent(
          "create",
          file.path,
          "",
          !(file instanceof TFile),
        );
        this.refreshIfWallpaper(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => this.refreshIfWallpaper(file.path)),
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.wallpaperPools.invalidateVaultEvent(
          "delete",
          file.path,
          "",
          !(file instanceof TFile),
        );
        if (this.wallpaperLibrary.prune(file.path)) this.scheduleSave();
        this.refreshIfWallpaper(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.wallpaperPools.invalidateVaultEvent(
          "rename",
          file.path,
          oldPath,
          !(file instanceof TFile),
        );
        const selectedPoolPathRenamed = Array.from(this.documents.values()).some(
          (state) => state.path === oldPath || state.path.startsWith(`${oldPath}/`),
        );
        const rename = rewriteSettingsForVaultRename(this.settings, oldPath, file.path);
        const libraryChanged = this.wallpaperLibrary.rewritePaths(rename.rewritePath);
        const preservedPoolContexts = this.wallpaperPools.rewriteSelectionsForRename(
          this.settings,
          rename.settings,
          rename.rewritePath,
        );

        if (rename.changed) this.updateSettings(rename.settings, false, preservedPoolContexts);
        else {
          if (libraryChanged) this.scheduleSave();
          this.refreshWallpaper(selectedPoolPathRenamed);
        }
      }),
    );
  }

  private refreshIfWallpaper(path: string): void {
    const selectedPaths = [
      this.settings.wallpaperPath,
      ...this.settings.profiles.map((profile) => profile.wallpaperPath),
      ...this.settings.wallpaperRules.map((rule) => rule.wallpaperPath),
    ];
    const touches = (candidate: string): boolean =>
      candidate === path || candidate.startsWith(`${path}/`);
    const loadedPath = Array.from(this.documents.values()).some((state) => touches(state.path));
    if (selectedPaths.some(touches) || loadedPath) this.refreshWallpaper(true);
  }

  private applyToWorkspace(): void {
    if (this.unloaded) return;
    const documents = new Set(this.documents.keys());
    documents.add(this.app.workspace.containerEl.ownerDocument);
    this.app.workspace.iterateAllLeaves((leaf) => {
      documents.add(leaf.view.containerEl.ownerDocument);
    });
    for (const document of documents) {
      if (document.defaultView?.closed) {
        this.documentContexts.forgetDocument(document);
        this.clearDocument(document);
      } else {
        this.applyToDocument(document);
      }
    }
  }

  private applyOptions(
    document: Document,
    state: DocumentState,
    context: NoteContext | null,
    appearanceOverride?: VeilAppearance,
  ): void {
    const resolved = appearanceOverride ? null : this.scenes.resolve(this.settings, context);
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
    const context = this.documentContexts.contextForDocument(document);
    const current = this.documents.get(document) || null;
    const sourceResolution = this.wallpaperSources.resolve(context, this.sourceRevision);
    const source = sourceResolution.source;
    if (!source) {
      this.setDocumentStatus(
        document,
        sourceResolution.statusMessage,
        sourceResolution.statusTone,
      );
      const resolved = sourceResolution.resolved;
      const shouldRetain = shouldRetainWallpaperForUnavailableSource(
        resolved.path,
        Boolean(resolved.rule || resolved.profile),
      );
      const fallback = shouldRetain ? workingWallpaperFallback(current) : null;
      if (fallback) {
        if (current && current !== fallback) {
          current.outgoing = null;
          this.documents.delete(document);
          this.disposeState(current);
          this.documents.set(document, fallback);
        }
        this.applyOptions(document, fallback, context, fallback.appearance);
        return;
      }
      this.clearDocument(document);
      return;
    }
    if (current?.key !== source.key) {
      this.setDocumentStatus(
        document,
        `${source.contextLabel} · loading ${source.label.toLowerCase()}: ${source.path}`,
      );
    }

    let previous = current;
    if (previous?.key === source.key && previous.layer.isConnected) {
      this.applyOptions(document, previous, context, source.appearance);
      this.setDocumentStatus(document, `${source.contextLabel} · ${source.label}: ${source.path}`, "success");
      return;
    }

    if (previous && (!previous.ready || previous.failed || !previous.layer.isConnected)) {
      const fallback = retainedOutgoingForPending(previous);
      if (fallback) previous.outgoing = null;
      this.documents.delete(document);
      this.disposeState(previous);
      previous = fallback;
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
      path: source.path,
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
      if (!isCurrent() || activeState.ready) return;
      activeState.ready = true;
      layer.hidden = false;
      this.applyOptions(
        document,
        activeState,
        this.documentContexts.contextForDocument(document),
      );
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
        this.applyOptions(
          document,
          fallback,
          this.documentContexts.contextForDocument(document),
          fallback.appearance,
        );
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

  private contextKey(ruleId: string, profileId: string): string {
    if (profileId) return `profile:${profileId}`;
    if (ruleId) return `rule:${ruleId}`;
    return "default";
  }

  private setDocumentStatus(
    document: Document,
    message: string,
    tone: StatusTone = "info",
  ): void {
    if (document === this.app.workspace.containerEl.ownerDocument) this.setStatus(message, tone);
  }
}
