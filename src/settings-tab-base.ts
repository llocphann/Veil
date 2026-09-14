import { Notice, PluginSettingTab, setIcon } from "obsidian";
import type {
  App,
  SettingDefinition,
  SettingDefinitionItem,
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
  chooseVeilSettingsImportFile,
  exportVeilSettingsFile,
  type SettingsTransferIoActions,
} from "./settings-transfer-io";
import {
  createActiveContextDefinition,
  createWallpaperDefinitions,
  type WallpaperDefinitionActions,
} from "./settings-wallpaper-definitions";
import {
  DEFAULT_SETTINGS,
  type VeilSettings,
} from "./settings";

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
    if (controlValue(this.plugin.settings, key) === value) return;

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
      if (ruleKey.kind === "wallpaper") {
        if (!this.plugin.settings.wallpaperRules.some((rule) => rule.id === ruleKey.id)) return;
        const wallpaperRules = this.plugin.settings.wallpaperRules.map((rule) => {
          if (rule.id !== ruleKey.id) return rule;
          const next = { ...rule };
          setRuleControlValue(next, ruleKey.field, value);
          return next;
        });
        this.plugin.updateSettings({ wallpaperRules });
      } else {
        if (!this.plugin.settings.opacityExclusions.some((rule) => rule.id === ruleKey.id)) return;
        const opacityExclusions = this.plugin.settings.opacityExclusions.map((rule) => {
          if (rule.id !== ruleKey.id) return rule;
          const next = { ...rule };
          setRuleControlValue(next, ruleKey.field, value);
          return next;
        });
        this.plugin.updateSettings({ opacityExclusions });
      }
      if (ruleControlRequiresRender(ruleKey.field)) this.update();
      else this.refreshDomState();
      return;
    }

    if (!(key in DEFAULT_SETTINGS)) return;
    this.plugin.updateSettings({ [key]: value } as Partial<VeilSettings>);
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
    return createWallpaperDefinitions(
      this.plugin.settings,
      this.wallpaperDefinitionActions(),
      (key, name, desc, maximum, unit, disabled) =>
        this.slider(key, name, desc, maximum, unit, disabled),
      (key, name, desc, minimum, maximum, step, unit, disabled) =>
        this.rangeSlider(key, name, desc, minimum, maximum, step, unit, disabled),
    );
  }

  private wallpaperDefinitionActions(): WallpaperDefinitionActions {
    return {
      openWallpaperLibrary: () => this.plugin.openWallpaperLibrary(),
      bindWallpaperStatus: (descEl, settingEl) => {
        this.statusEl = descEl;
        this.statusRowEl = settingEl;
        this.updateStatus();
        return () => {
          if (this.statusEl === descEl) this.statusEl = null;
          if (this.statusRowEl === settingEl) this.statusRowEl = null;
        };
      },
      activeContextSummary: () => this.plugin.activeContextSummary(),
      bindActiveContext: (descEl) => {
        this.contextEl = descEl;
        this.updateStatus();
        return () => {
          if (this.contextEl === descEl) this.contextEl = null;
        };
      },
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
    return createActiveContextDefinition(this.wallpaperDefinitionActions());
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
      exportSettings: () => exportVeilSettingsFile(
        this.containerEl,
        this.plugin.settings,
        this.plugin.manifest.version,
      ),
      importSettings: () => chooseVeilSettingsImportFile(
        this.containerEl,
        this.transferIoActions(),
      ),
      restoreDefaults: () => {
        this.plugin.updateSettings({ ...DEFAULT_SETTINGS });
        void this.plugin.flushSettings().then(() => this.update());
      },
    };
  }

  private transferIoActions(): SettingsTransferIoActions {
    return {
      applyImportedSettings: async (settings) => {
        this.plugin.updateSettings(settings);
        await this.plugin.flushSettings();
      },
      refreshSettings: () => this.update(),
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

  hide(): void {
    this.statusEl = null;
    this.statusRowEl = null;
    this.contextEl = null;
    void this.plugin.flushSettings();
  }
}
