import { Notice, PluginSettingTab, normalizePath, setIcon } from "obsidian";
import type {
  App,
  SettingDefinition,
  SettingDefinitionItem,
  TFile,
} from "obsidian";
import type VeilPlugin from "./main";
import {
  createActionsDefinitions,
  createSupportDefinitions,
  type SettingsActionDefinitionsActions,
} from "./settings-action-definitions";
import {
  createEffectsDefinitions,
  createVideoDefinitions,
} from "./settings-appearance-definitions";
import {
  appendOpacityExclusion,
  appendScene,
  appendWallpaperRule,
  copyGlobalAppearanceToScene,
  deleteOpacityExclusion as removeOpacityExclusion,
  deleteScene as removeScene,
  deleteWallpaperRule as removeWallpaperRule,
  duplicateScene as duplicateSceneCollection,
  reorderOpacityExclusions,
  reorderScenes,
  reorderWallpaperRules,
} from "./settings-collection-model";
import {
  controlValue,
  findRule,
  globalControlRequiresRender,
  parseProfileControlKey,
  parseRuleControlKey,
  profileControlRequiresRender,
  ruleControlRequiresRender,
  setRuleControlValue,
} from "./settings-control-model";
import {
  createOpacityExclusionDefinitions,
  createWallpaperRuleDefinitions,
  type RoutingDefinitionActions,
} from "./settings-routing-definitions";
import {
  createSceneDefinitions,
  type SceneDefinitionActions,
} from "./settings-scene-definitions";
import {
  DEFAULT_SETTINGS,
  DISPLAY_MODES,
  mediaKind,
  normalizeSettings,
} from "./settings";
import { parseVeilSettingsImport, serializeVeilSettings } from "./settings-transfer";

const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_SCENES = 64;
const MAX_CONTEXT_RULES = 96;
const SETTINGS_TABS = [
  { id: "wallpaper", label: "Wallpaper", icon: "image" },
  { id: "rules", label: "Rules", icon: "list-filter" },
  { id: "effects", label: "Effects", icon: "sparkles" },
  { id: "video", label: "Video", icon: "video" },
  { id: "actions", label: "Actions", icon: "rotate-ccw" },
  { id: "support", label: "Support", icon: "heart" },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export class WallpaperSettingsTab extends PluginSettingTab {
  private readonly plugin: VeilPlugin;
  private statusEl: HTMLElement | null = null;
  private statusRowEl: HTMLElement | null = null;
  private contextEl: HTMLElement | null = null;
  private activeTab: SettingsTabId = "wallpaper";

  constructor(app: App, plugin: VeilPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getControlValue(key: string): unknown {
    return controlValue(this.plugin.settings, key);
  }

  setControlValue(key: string, value: unknown): void {
    const profileKey = parseProfileControlKey(key);
    if (profileKey) {
      const profiles = this.plugin.settings.profiles.map((profile) =>
        profile.id === profileKey.id
          ? { ...profile, [profileKey.field]: value }
          : profile,
      );
      this.plugin.updateSettings({ profiles });
      if (profileControlRequiresRender(profileKey.field)) this.update();
      else this.refreshDomState();
      return;
    }

    const ruleKey = parseRuleControlKey(key);
    if (ruleKey) {
      const rule = findRule(this.plugin.settings, ruleKey.kind, ruleKey.id);
      if (!rule) return;
      setRuleControlValue(rule, ruleKey.field, value);
      this.plugin.updateSettings({
        wallpaperRules: this.plugin.settings.wallpaperRules,
        opacityExclusions: this.plugin.settings.opacityExclusions,
      });
      if (ruleControlRequiresRender(ruleKey.field)) this.update();
      else this.refreshDomState();
      return;
    }

    if (!(key in DEFAULT_SETTINGS)) return;
    const next = normalizeSettings({ ...this.plugin.settings, [key]: value }, normalizePath);
    this.plugin.updateSettings(next);
    if (globalControlRequiresRender(key)) this.update();
    else this.refreshDomState();
  }

  updateStatus(): void {
    if (this.statusEl?.isConnected && this.statusRowEl?.isConnected) {
      this.statusEl.textContent = this.plugin.status.message;
      this.statusRowEl.dataset.tone = this.plugin.status.tone;
    }
    if (this.contextEl?.isConnected) {
      this.contextEl.textContent = this.plugin.activeContextSummary();
    }
  }

  getSettingDefinitions(): SettingDefinitionItem<string>[] {
    return [
      this.tabs(),
      this.wallpaperDefinitions(),
      this.sceneDefinitions(),
      this.activeContextDefinition(),
      this.wallpaperRuleDefinitions(),
      this.opacityExclusionDefinitions(),
      this.effectsDefinitions(),
      this.videoDefinitions(),
      this.actionsDefinitions(),
      this.supportDefinitions(),
    ];
  }

  private rangeSlider(
    key: string,
    name: string,
    desc: string,
    minimum: number,
    maximum: number,
    step: number,
    unit: string,
    disabled?: () => boolean,
  ): SettingDefinition<string> {
    return {
      name,
      desc,
      control: {
        type: "slider",
        key,
        min: minimum,
        max: maximum,
        step,
        displayFormat: (value) => `${value}${unit}`,
        disabled,
      },
    };
  }

  private slider(
    key: string,
    name: string,
    desc: string,
    maximum = 100,
    unit = "%",
    disabled?: () => boolean,
  ): SettingDefinition<string> {
    return this.rangeSlider(key, name, desc, 0, maximum, 1, unit, disabled);
  }

  private tabs(): SettingDefinitionItem<string> {
    return {
      type: "group",
      cls: "veil-settings-tabs-group",
      items: [{
        name: "Settings sections",
        searchable: false,
        render: (setting) => {
          this.containerEl.classList.add("veil-settings-root");
          this.containerEl.dataset.veilSettingsTab = this.activeTab;
          setting.settingEl.classList.add("veil-settings-tabs-setting");
          const tabList = setting.controlEl.createDiv({ cls: "veil-settings-tabs" });
          tabList.setAttribute("role", "tablist");
          tabList.setAttribute("aria-label", "Veil settings sections");
          const buttons: HTMLButtonElement[] = [];
          const cleanups: Array<() => void> = [];

          const activate = (tabId: SettingsTabId, focus = false): void => {
            this.activeTab = tabId;
            this.containerEl.dataset.veilSettingsTab = tabId;
            for (const candidate of buttons) {
              const selected = candidate.dataset.tabId === tabId;
              candidate.setAttribute("aria-selected", String(selected));
              candidate.tabIndex = selected ? 0 : -1;
              if (selected && focus) candidate.focus();
            }
          };

          for (const tab of SETTINGS_TABS) {
            const button = tabList.createEl("button", {
              cls: "veil-settings-tab",
              attr: {
                type: "button",
                role: "tab",
                "data-tab-id": tab.id,
                "aria-selected": "false",
              },
            });
            const icon = button.createSpan({ cls: "veil-settings-tab-icon" });
            setIcon(icon, tab.icon);
            button.createSpan({ text: tab.label });
            const onClick = (): void => activate(tab.id);
            button.addEventListener("click", onClick);
            cleanups.push(() => button.removeEventListener("click", onClick));
            buttons.push(button);
          }

          const onKeyDown = (event: KeyboardEvent): void => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            const activeElement = this.containerEl.ownerDocument.activeElement;
            const currentIndex = Math.max(
              0,
              buttons.findIndex((button) => button === activeElement),
            );
            let nextIndex = currentIndex;
            if (event.key === "ArrowLeft") {
              nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
            }
            if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = buttons.length - 1;
            const nextTab = SETTINGS_TABS[nextIndex];
            if (!nextTab) return;
            event.preventDefault();
            activate(nextTab.id, true);
          };
          tabList.addEventListener("keydown", onKeyDown);
          cleanups.push(() => tabList.removeEventListener("keydown", onKeyDown));
          activate(this.activeTab);
          return () => cleanups.forEach((cleanup) => cleanup());
        },
      }],
    };
  }

  private wallpaperDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "group",
      heading: "Wallpaper",
      cls: "veil-settings-panel-wallpaper",
      items: [
        {
          name: "Live preview",
          desc: "Changes preview immediately. Rules can replace only the wallpaper or switch the complete appearance through a scene.",
          searchable: false,
        },
        {
          name: "Enable wallpaper",
          desc: "Restore the theme's normal background when turned off.",
          control: { type: "toggle", key: "enabled" },
        },
        {
          name: "Wallpaper file",
          desc: "Choose an image, GIF, or video from this vault. With a pool enabled, this file anchors the pool folder.",
          control: {
            type: "file",
            key: "wallpaperPath",
            placeholder: "Media/Wallpapers/example.webp",
            filter: (file: TFile) => Boolean(mediaKind(file)),
          },
        },
        {
          name: "Wallpaper library",
          desc: "Browse all supported vault media visually, search paths, and manage favorites or recently selected files.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Open library")
                .setIcon("images")
                .onClick(() => this.plugin.openWallpaperLibrary()),
            );
          },
        },
        {
          name: "Wallpaper pool",
          desc: "Randomly choose supported media from the selected wallpaper's folder. The choice stays stable until shuffled or the appearance changes.",
          control: { type: "toggle", key: "wallpaperPoolEnabled" },
        },
        {
          name: "Include subfolders",
          desc: "Also include supported media in descendant folders of the wallpaper folder.",
          control: { type: "toggle", key: "wallpaperPoolIncludeSubfolders" },
          visible: () => this.plugin.settings.wallpaperPoolEnabled,
        },
        {
          name: "Wallpaper status",
          desc: "Waiting for the workspace…",
          searchable: false,
          render: (setting) => {
            setting.settingEl.classList.add("vault-dashboard-wallpaper-status");
            setting.descEl.setAttribute("role", "status");
            setting.descEl.setAttribute("aria-live", "polite");
            this.statusEl = setting.descEl;
            this.statusRowEl = setting.settingEl;
            this.updateStatus();
            return () => {
              if (this.statusEl === setting.descEl) this.statusEl = null;
              if (this.statusRowEl === setting.settingEl) this.statusRowEl = null;
            };
          },
        },
        {
          name: "Display mode",
          desc: "The same sizing rules apply to every supported media type.",
          control: { type: "dropdown", key: "displayMode", options: DISPLAY_MODES },
        },
        this.slider(
          "wallpaperPositionX",
          "Horizontal focal point",
          "Move the crop focus from the left edge (0%) to the right edge (100%).",
        ),
        this.slider(
          "wallpaperPositionY",
          "Vertical focal point",
          "Move the crop focus from the top edge (0%) to the bottom edge (100%).",
        ),
        this.rangeSlider(
          "wallpaperZoom",
          "Wallpaper zoom",
          "Zoom into the wallpaper while keeping the selected focal point anchored.",
          100,
          200,
          1,
          "%",
        ),
        this.rangeSlider(
          "transitionDuration",
          "Wallpaper transition",
          "Crossfade duration for rule, scene, and pool changes. Set to 0 for an instant switch.",
          0,
          2000,
          20,
          " ms",
        ),
        this.slider(
          "opacity",
          "Wallpaper opacity",
          "0% hides the wallpaper; 100% shows its full opacity.",
        ),
        this.slider(
          "paneOpacity",
          "Pane background opacity",
          "Lower values reveal more wallpaper without fading pane content.",
        ),
        this.slider(
          "paneContentOpacity",
          "Pane & content opacity",
          "Fade each outer pane as one group, including nested backgrounds, text, icons, and images.",
        ),
      ],
    };
  }

  private sceneDefinitions(): SettingDefinitionItem<string> {
    return createSceneDefinitions(
      this.app,
      this.plugin.settings,
      this.sceneDefinitionActions(),
      (key, name, desc, maximum, unit, disabled) =>
        this.slider(key, name, desc, maximum, unit, disabled),
      (key, name, desc, minimum, maximum, step, unit, disabled) =>
        this.rangeSlider(key, name, desc, minimum, maximum, step, unit, disabled),
    );
  }

  private sceneDefinitionActions(): SceneDefinitionActions {
    return {
      addScene: () => this.addScene(),
      reorderScene: (oldIndex, newIndex) => this.reorderScene(oldIndex, newIndex),
      deleteScene: (id) => this.deleteProfile(id),
      duplicateScene: (id) => this.duplicateScene(id),
      copyGlobalAppearanceToScene: (id) => this.copyGlobalAppearanceToProfile(id),
    };
  }

  private addScene(): void {
    if (this.plugin.settings.profiles.length >= MAX_SCENES) {
      new Notice(`Veil supports up to ${MAX_SCENES} scenes.`);
      return;
    }
    this.plugin.updateSettings({ profiles: appendScene(this.plugin.settings) });
    this.update();
  }

  private reorderScene(oldIndex: number, newIndex: number): void {
    const profiles = reorderScenes(this.plugin.settings.profiles, oldIndex, newIndex);
    if (!profiles) return;
    this.plugin.updateSettings({ profiles });
    this.update();
  }

  private activeContextDefinition(): SettingDefinitionItem<string> {
    return {
      type: "group",
      heading: "Active context",
      cls: "veil-settings-panel-rules",
      items: [{
        name: "Resolved appearance",
        desc: this.plugin.activeContextSummary(),
        searchable: false,
        render: (setting) => {
          this.contextEl = setting.descEl;
          setting.descEl.setAttribute("role", "status");
          setting.descEl.setAttribute("aria-live", "polite");
          this.updateStatus();
          return () => {
            if (this.contextEl === setting.descEl) this.contextEl = null;
          };
        },
      }],
    };
  }

  private wallpaperRuleDefinitions(): SettingDefinitionItem<string> {
    return createWallpaperRuleDefinitions(
      this.app,
      this.plugin.settings,
      this.routingDefinitionActions(),
    );
  }

  private opacityExclusionDefinitions(): SettingDefinitionItem<string> {
    return createOpacityExclusionDefinitions(
      this.plugin.settings,
      this.routingDefinitionActions(),
    );
  }

  private routingDefinitionActions(): RoutingDefinitionActions {
    return {
      addWallpaperRule: () => this.addWallpaperRule(),
      reorderWallpaperRule: (oldIndex, newIndex) =>
        this.reorderWallpaperRule(oldIndex, newIndex),
      deleteWallpaperRule: (id) => this.deleteWallpaperRule(id),
      addOpacityExclusion: () => this.addOpacityExclusion(),
      reorderOpacityExclusion: (oldIndex, newIndex) =>
        this.reorderOpacityExclusion(oldIndex, newIndex),
      deleteOpacityRule: (id) => this.deleteOpacityRule(id),
    };
  }

  private addWallpaperRule(): void {
    if (this.plugin.settings.wallpaperRules.length >= MAX_CONTEXT_RULES) {
      new Notice(`Veil supports up to ${MAX_CONTEXT_RULES} wallpaper rules.`);
      return;
    }
    this.plugin.updateSettings({
      wallpaperRules: appendWallpaperRule(this.plugin.settings.wallpaperRules),
    });
    this.update();
  }

  private reorderWallpaperRule(oldIndex: number, newIndex: number): void {
    const wallpaperRules = reorderWallpaperRules(
      this.plugin.settings.wallpaperRules,
      oldIndex,
      newIndex,
    );
    if (!wallpaperRules) return;
    this.plugin.updateSettings({ wallpaperRules });
    this.update();
  }

  private addOpacityExclusion(): void {
    if (this.plugin.settings.opacityExclusions.length >= MAX_CONTEXT_RULES) {
      new Notice(`Veil supports up to ${MAX_CONTEXT_RULES} opacity exclusions.`);
      return;
    }
    this.plugin.updateSettings({
      opacityExclusions: appendOpacityExclusion(this.plugin.settings.opacityExclusions),
    });
    this.update();
  }

  private reorderOpacityExclusion(oldIndex: number, newIndex: number): void {
    const opacityExclusions = reorderOpacityExclusions(
      this.plugin.settings.opacityExclusions,
      oldIndex,
      newIndex,
    );
    if (!opacityExclusions) return;
    this.plugin.updateSettings({ opacityExclusions });
    this.update();
  }

  private effectsDefinitions(): SettingDefinitionItem<string> {
    return createEffectsDefinitions(
      this.plugin.settings,
      (key, name, desc, maximum, unit, disabled) =>
        this.slider(key, name, desc, maximum, unit, disabled),
    );
  }

  private videoDefinitions(): SettingDefinitionItem<string> {
    return createVideoDefinitions();
  }

  private actionsDefinitions(): SettingDefinitionItem<string> {
    return createActionsDefinitions(this.actionDefinitionActions());
  }

  private supportDefinitions(): SettingDefinitionItem<string> {
    return createSupportDefinitions();
  }

  private actionDefinitionActions(): SettingsActionDefinitionsActions {
    return {
      openWallpaperLibrary: () => this.plugin.openWallpaperLibrary(),
      reloadWallpaper: () => this.plugin.refreshWallpaper(true),
      shuffleWallpaperPool: () => this.plugin.shuffleWallpaperPool(),
      exportSettings: () => this.exportSettings(),
      importSettings: () => this.chooseImportFile(),
      restoreDefaults: () => {
        this.plugin.updateSettings({ ...DEFAULT_SETTINGS });
        void this.plugin.flushSettings().then(() => this.update());
      },
    };
  }

  private duplicateScene(id: string): void {
    if (this.plugin.settings.profiles.length >= MAX_SCENES) {
      new Notice(`Veil supports up to ${MAX_SCENES} scenes.`);
      return;
    }
    const profiles = duplicateSceneCollection(this.plugin.settings, id);
    if (!profiles) return;
    this.plugin.updateSettings({ profiles });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private copyGlobalAppearanceToProfile(id: string): void {
    const profiles = copyGlobalAppearanceToScene(this.plugin.settings, id);
    if (!profiles) return;
    this.plugin.updateSettings({ profiles });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private deleteProfile(id: string): void {
    const collections = removeScene(this.plugin.settings, id);
    if (!collections) return;
    this.plugin.updateSettings(collections);
    void this.plugin.flushSettings().then(() => this.update());
  }

  private deleteWallpaperRule(id: string): void {
    const wallpaperRules = removeWallpaperRule(this.plugin.settings.wallpaperRules, id);
    if (!wallpaperRules) return;
    this.plugin.updateSettings({ wallpaperRules });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private deleteOpacityRule(id: string): void {
    const opacityExclusions = removeOpacityExclusion(this.plugin.settings.opacityExclusions, id);
    if (!opacityExclusions) return;
    this.plugin.updateSettings({ opacityExclusions });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private exportSettings(): void {
    const text = serializeVeilSettings(this.plugin.settings, this.plugin.manifest.version);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = this.containerEl.createEl("a");
    link.href = url;
    link.download = `veil-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.hidden = true;
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 0);
    new Notice("Veil settings exported.");
  }

  private chooseImportFile(): void {
    const input = this.containerEl.createEl("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    const cleanup = (): void => input.remove();
    input.addEventListener("cancel", cleanup, { once: true });
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        return;
      }
      void this.importSettings(file).finally(cleanup);
    }, { once: true });
    input.click();
  }

  private async importSettings(file: File): Promise<void> {
    if (file.size > MAX_IMPORT_BYTES) {
      new Notice("Veil settings import is limited to one megabyte.");
      return;
    }
    try {
      const imported = parseVeilSettingsImport(await file.text(), normalizePath);
      this.plugin.updateSettings(imported);
      await this.plugin.flushSettings();
      this.update();
      new Notice("Veil settings imported.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error.";
      new Notice(`Veil could not import settings: ${message}`);
    }
  }

  hide(): void {
    this.statusEl = null;
    this.statusRowEl = null;
    this.contextEl = null;
    void this.plugin.flushSettings();
  }
}
