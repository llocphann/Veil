import {
  Notice,
  Plugin,
  TFile,
  normalizePath,
} from "obsidian";
import type { NoteContext } from "./context-rules";
import { DocumentApplyScheduler } from "./document-apply-scheduler";
import { DocumentContextResolver } from "./document-context-resolver";
import { SceneRuntime } from "./scene-runtime";
import { SceneSwitcherModal } from "./scene-switcher-modal";
import { veilSettingsEqual } from "./settings-change-detection";
import { classifySettingsChange } from "./settings-change-impact";
import { resolvedDocumentSettingsChanged } from "./settings-document-invalidation";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
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
import { vaultChangeAffectsDocument } from "./vault-document-invalidation";
import { rewriteSettingsForVaultRename } from "./vault-settings-rename";
import {
  applyDocumentAppearance,
  restoreDocumentAppearance,
} from "./wallpaper-document-appearance";
import {
  disposeWallpaperState,
  settleWallpaperState,
  startWallpaperCrossfade,
  syncWallpaperPlayback,
} from "./wallpaper-media-lifecycle";
import type { WallpaperDocumentState } from "./wallpaper-document-state";
import { WallpaperLibraryModal } from "./wallpaper-library-modal";
import { WallpaperLibraryRuntime } from "./wallpaper-library-runtime";
import {
  wallpaperLibraryTargetPatch,
  wallpaperLibraryTargets,
} from "./wallpaper-library-targets";
import { WallpaperPoolRuntime } from "./wallpaper-pool-runtime";
import { WallpaperSourceResolver } from "./wallpaper-source-resolver";
import { WallpaperSettingsTab } from "./settings-tab";

const LAYER_CLASS = "vault-dashboard-wallpaper";

type DocumentState = WallpaperDocumentState;
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
  private readonly documentApply = new DocumentApplyScheduler(
    () => !this.unloaded && this.layoutReady,
    () => this.applyToWorkspace(),
    (document) => this.applyScheduledDocument(document),
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
      const document = this.documentContexts.rememberActiveRootLeaf(leaf);
      if (document) this.scheduleApplyToDocuments([document]);
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refreshMostRecentDocument()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.refreshWallpaper()));
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (!this.layoutReady) return;
        this.scheduleApplyToDocuments(this.documentContexts.documentsForFile(file));
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
    this.documentApply.cancel();
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
    if (veilSettingsEqual(previous, next)) return;
    const impact = classifySettingsChange(previous, next);
    const affectedDocuments = impact.documentResolution && !impact.enabled
      ? this.documentsAffectedBySettings(previous, next)
      : null;
    if (rememberRecent && impact.libraryRecent) {
      this.wallpaperLibrary.rememberSettingsChanges(previous, next);
    }
    this.settings = next;
    if (impact.sceneRuntime) this.scenes.reconcileSettings(next);
    if (impact.poolRuntime) {
      this.wallpaperPools.reconcileSettings(previous, next, preservedPoolContexts);
    }
    if (impact.routingSchedule) this.systemRouting.reschedule();
    if (impact.documentResolution) {
      if (impact.enabled) this.refreshWallpaper();
      else if (affectedDocuments?.size) this.scheduleApplyToDocuments(affectedDocuments);
    }
    this.scheduleSave();
  }

  public flushSettings(): Promise<void> {
    return this.settingsPersistence.flush();
  }

  public refreshWallpaper(force = false): void {
    if (this.unloaded || !this.layoutReady) return;
    if (!this.settings.enabled) {
      this.documentApply.cancel();
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
    const affectedDocuments = this.documentsUsingPoolContext(contextKey);
    this.wallpaperPools.shuffle(resolved.appearance, contextKey);
    if (affectedDocuments.size) this.scheduleApplyToDocuments(affectedDocuments);
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
    this.documentApply.scheduleAll();
  }

  private scheduleApplyToDocuments(documents: Iterable<Document>): void {
    this.documentApply.scheduleDocuments(documents);
  }

  private refreshMostRecentDocument(): void {
    if (this.unloaded || !this.layoutReady) return;
    const document = this.documentContexts.rememberActiveRootLeaf(
      this.app.workspace.getMostRecentLeaf(),
    );
    if (document) this.scheduleApplyToDocuments([document]);
    else this.refreshWallpaper();
  }

  private workspaceDocuments(): Set<Document> {
    const documents = new Set(this.documents.keys());
    documents.add(this.app.workspace.containerEl.ownerDocument);
    this.app.workspace.iterateAllLeaves((leaf) => {
      documents.add(leaf.view.containerEl.ownerDocument);
    });
    return documents;
  }

  private documentsAffectedBySettings(
    previous: VeilSettings,
    next: VeilSettings,
  ): Set<Document> {
    const affected = new Set<Document>();
    for (const document of this.workspaceDocuments()) {
      if (document.defaultView?.closed) {
        affected.add(document);
        continue;
      }
      const currentContext = this.documentContexts.contextForDocument(document);
      const context: NoteContext = { ...currentContext, now: new Date() };
      const previousResolved = this.scenes.resolveSnapshot(previous, context);
      const nextResolved = this.scenes.resolveSnapshot(next, context);
      if (
        resolvedDocumentSettingsChanged(
          previous,
          next,
          context,
          previousResolved,
          nextResolved,
        )
      ) {
        affected.add(document);
      }
    }
    return affected;
  }

  private documentsUsingPoolContext(contextKey: string): Set<Document> {
    const affected = new Set<Document>();
    if (!this.settings.enabled) return affected;
    for (const document of this.workspaceDocuments()) {
      if (document.defaultView?.closed) continue;
      const context = this.documentContexts.contextForDocument(document);
      const resolved = this.scenes.resolveSnapshot(this.settings, context);
      const poolAllowed = !resolved.rule || Boolean(resolved.profile);
      if (!poolAllowed || !resolved.appearance.wallpaperPoolEnabled) continue;
      const resolvedContextKey = this.contextKey(
        resolved.rule?.id || "",
        resolved.profile?.id || "",
      );
      if (resolvedContextKey === contextKey) affected.add(document);
    }
    return affected;
  }

  private documentsAffectedByVaultPath(path: string): Set<Document> {
    const affected = new Set<Document>();
    if (!this.settings.enabled) return affected;
    for (const document of this.workspaceDocuments()) {
      if (document.defaultView?.closed) continue;
      const context = this.documentContexts.contextForDocument(document);
      const resolved = this.scenes.resolveSnapshot(this.settings, context);
      const loadedPath = this.documents.get(document)?.path || "";
      if (vaultChangeAffectsDocument(path, loadedPath, resolved.path)) {
        affected.add(document);
      }
    }
    return affected;
  }

  private refreshDocumentsAffectedByVaultPath(path: string): void {
    const affected = this.documentsAffectedByVaultPath(path);
    if (affected.size) this.scheduleApplyToDocuments(affected);
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
        this.refreshDocumentsAffectedByVaultPath(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) =>
        this.refreshDocumentsAffectedByVaultPath(file.path),
      ),
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
        this.refreshDocumentsAffectedByVaultPath(file.path);
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const renamedDocuments = this.documentsAffectedByVaultPath(oldPath);
        this.wallpaperPools.invalidateVaultEvent(
          "rename",
          file.path,
          oldPath,
          !(file instanceof TFile),
        );
        const rename = rewriteSettingsForVaultRename(this.settings, oldPath, file.path);
        const libraryChanged = this.wallpaperLibrary.rewritePaths(rename.rewritePath);
        const preservedPoolContexts = this.wallpaperPools.rewriteSelectionsForRename(
          this.settings,
          rename.settings,
          rename.rewritePath,
        );

        if (rename.changed) this.updateSettings(rename.settings, false, preservedPoolContexts);
        else if (libraryChanged) this.scheduleSave();
        if (renamedDocuments.size) this.scheduleApplyToDocuments(renamedDocuments);
      }),
    );
  }

  private applyToWorkspace(): void {
    if (this.unloaded) return;
    for (const document of this.workspaceDocuments()) this.applyScheduledDocument(document);
  }

  private applyScheduledDocument(document: Document): void {
    if (document.defaultView?.closed) {
      this.documentContexts.forgetDocument(document);
      this.clearDocument(document);
      return;
    }
    this.applyToDocument(document);
  }

  private applyOptions(
    document: Document,
    state: DocumentState,
    context: NoteContext | null,
    appearanceOverride?: VeilAppearance,
  ): void {
    const resolved = appearanceOverride ? null : this.scenes.resolve(this.settings, context);
    const appearance = appearanceOverride || resolved?.appearance || state.appearance;
    applyDocumentAppearance({
      document,
      state,
      context,
      appearance,
      opacityExclusions: this.settings.opacityExclusions,
      profileId: resolved?.profile?.id || null,
      updateProfileId: !appearanceOverride,
    });
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
      previous.sourceLabel = source.label;
      previous.contextLabel = source.contextLabel;
      this.applyOptions(document, previous, context, source.appearance);
      this.setDocumentStatus(
        document,
        previous.ready
          ? `${source.contextLabel} · ${source.label}: ${source.path}`
          : `${source.contextLabel} · loading ${source.label.toLowerCase()}: ${source.path}`,
        previous.ready ? "success" : "info",
      );
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
      sourceLabel: source.label,
      contextLabel: source.contextLabel,
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
        `${activeState.contextLabel || source.contextLabel} · ${
          activeState.sourceLabel || source.label
        } loaded: ${activeState.path}`,
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
        `Could not load ${activeState.path}${
          activeState.kind === "video"
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
    startWallpaperCrossfade({
      document,
      state,
      getCurrentState: () => this.documents.get(document) || null,
    });
  }

  private settleState(state: DocumentState): void {
    settleWallpaperState(state);
  }

  private syncPlaybackAndMotion(document: Document, state: DocumentState): void {
    syncWallpaperPlayback({
      document,
      state,
      isEnabled: () => this.settings.enabled,
      isUnloaded: () => this.unloaded,
      onError: (message) => this.setStatus(message, "error"),
    });
  }

  private disposeState(state: DocumentState): void {
    disposeWallpaperState(state);
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
    restoreDocumentAppearance(document);
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
