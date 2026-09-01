import { Notice, PluginSettingTab, normalizePath, setIcon } from "obsidian";
import type {
  App,
  SettingDefinition,
  SettingDefinitionItem,
  SettingDefinitionPage,
  TFile,
} from "obsidian";
import type VeilPlugin from "./main";
import {
  COLOR_OVERLAY_BLEND_MODES,
  DEFAULT_SETTINGS,
  DISPLAY_MODES,
  EFFECT_PRESETS,
  MATCH_TYPES,
  createOpacityExclusionRule,
  createProfile,
  createWallpaperRule,
  mediaKind,
  normalizeSettings,
  type ContextRule,
  type MatchType,
  type OpacityExclusionRule,
  type VeilProfile,
  type VeilSettings,
  type WallpaperRule,
} from "./settings";
import { parseVeilSettingsImport, serializeVeilSettings } from "./settings-transfer";

const FUNDING_URL = "https://www.buymeacoffee.com/llocphann";
const MAX_IMPORT_BYTES = 1024 * 1024;
const SETTINGS_TABS = [
  { id: "wallpaper", label: "Wallpaper", icon: "image" },
  { id: "rules", label: "Rules", icon: "list-filter" },
  { id: "effects", label: "Effects", icon: "sparkles" },
  { id: "video", label: "Video", icon: "video" },
  { id: "actions", label: "Actions", icon: "rotate-ccw" },
  { id: "support", label: "Support", icon: "heart" },
] as const;

const DYNAMIC_GLOBAL_KEYS = new Set<string>([
  "wallpaperPoolEnabled",
  "vignetteMode",
  "blurEnabled",
  "dimEnabled",
  "colorOverlayEnabled",
  "effectPreset",
]);

const DYNAMIC_PROFILE_FIELDS = new Set<string>([
  "name",
  "wallpaperPath",
  "wallpaperPoolEnabled",
  "vignetteMode",
  "blurEnabled",
  "dimEnabled",
  "colorOverlayEnabled",
  "effectPreset",
]);

type SettingKey = keyof VeilSettings;
type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

type RuleKind = "wallpaper" | "opacity";

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
    const profileKey = this.parseProfileKey(key);
    if (profileKey) {
      const profile = this.findProfile(profileKey.id);
      return profile
        ? (profile as unknown as Record<string, unknown>)[profileKey.field]
        : undefined;
    }

    const ruleKey = this.parseRuleKey(key);
    if (ruleKey) {
      const rule = this.findRule(ruleKey.kind, ruleKey.id);
      return rule
        ? (rule as unknown as Record<string, unknown>)[ruleKey.field]
        : undefined;
    }

    if (!(key in DEFAULT_SETTINGS)) return undefined;
    return this.plugin.settings[key as SettingKey];
  }

  setControlValue(key: string, value: unknown): void {
    const profileKey = this.parseProfileKey(key);
    if (profileKey) {
      const profiles = this.plugin.settings.profiles.map((profile) =>
        profile.id === profileKey.id
          ? { ...profile, [profileKey.field]: value }
          : profile,
      );
      this.plugin.updateSettings({ profiles });
      if (DYNAMIC_PROFILE_FIELDS.has(profileKey.field)) this.update();
      else this.refreshDomState();
      return;
    }

    const ruleKey = this.parseRuleKey(key);
    if (ruleKey) {
      const rule = this.findRule(ruleKey.kind, ruleKey.id);
      if (!rule) return;
      this.setRuleValue(rule, ruleKey.field, value);
      this.plugin.updateSettings({
        wallpaperRules: this.plugin.settings.wallpaperRules,
        opacityExclusions: this.plugin.settings.opacityExclusions,
      });
      if ([
        "matchType",
        "enabled",
        "profileId",
        "excludePaneSurface",
        "excludePaneContent",
      ].includes(ruleKey.field)) this.update();
      else this.refreshDomState();
      return;
    }

    if (!(key in DEFAULT_SETTINGS)) return;
    const next = normalizeSettings({ ...this.plugin.settings, [key]: value }, normalizePath);
    this.plugin.updateSettings(next);
    if (DYNAMIC_GLOBAL_KEYS.has(key)) this.update();
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
    return {
      type: "list",
      heading: "Scenes",
      cls: "veil-settings-panel-rules",
      emptyState: "No scenes. Create one from the current appearance, then route notes to it below.",
      items: this.plugin.settings.profiles.map((profile, index) => this.scenePage(profile, index)),
      addItem: {
        name: "Add scene from current appearance",
        action: () => {
          const profiles = [
            ...this.plugin.settings.profiles,
            createProfile(this.plugin.settings.profiles, this.plugin.settings),
          ];
          this.plugin.updateSettings({ profiles });
          this.update();
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const profiles = [...this.plugin.settings.profiles];
        const [profile] = profiles.splice(oldIndex, 1);
        if (!profile) return;
        profiles.splice(newIndex, 0, profile);
        this.plugin.updateSettings({ profiles });
        this.update();
      },
      onDelete: (index) => {
        const profile = this.plugin.settings.profiles[index];
        if (profile) this.deleteProfile(profile.id);
      },
    };
  }

  private scenePage(profile: VeilProfile, index: number): SettingDefinitionPage<string> {
    const key = (field: string): string => `profile:${profile.id}:${field}`;
    const file = profile.wallpaperPath
      ? this.app.vault.getFileByPath(normalizePath(profile.wallpaperPath))
      : null;
    const ready = Boolean(file && mediaKind(file));
    return {
      type: "page",
      name: profile.name || `Scene ${index + 1}`,
      desc: profile.wallpaperPath || "No wallpaper selected",
      displayValue: () => ready ? (profile.wallpaperPoolEnabled ? "Pool" : "Ready") : "Needs wallpaper",
      status: () => ready ? null : "warning",
      items: [
        {
          name: "Scene name",
          desc: "A short label shown when selecting this scene in a routing rule.",
          control: { type: "text", key: key("name"), placeholder: `Scene ${index + 1}` },
        },
        {
          name: "Wallpaper file",
          desc: "Media used by this scene. With a pool enabled, it anchors the pool folder.",
          control: {
            type: "file",
            key: key("wallpaperPath"),
            placeholder: "Media/Wallpapers/focus.webp",
            filter: (candidate: TFile) => Boolean(mediaKind(candidate)),
          },
        },
        {
          name: "Wallpaper pool",
          desc: "Randomly choose from supported media in this scene's wallpaper folder and keep the choice stable until shuffled.",
          control: { type: "toggle", key: key("wallpaperPoolEnabled") },
        },
        {
          name: "Include subfolders",
          desc: "Include descendant folders when building this scene's pool.",
          control: { type: "toggle", key: key("wallpaperPoolIncludeSubfolders") },
          visible: () => profile.wallpaperPoolEnabled,
        },
        ...this.sceneAppearanceDefinitions(profile, key),
        {
          name: "Copy current global appearance",
          desc: "Replace this scene's wallpaper, pool, framing, opacity, effects, transition, and video behavior with the current global appearance while keeping its name.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Copy current")
                .onClick(() => this.copyGlobalAppearanceToProfile(profile.id)),
            );
          },
        },
        {
          name: "Delete scene",
          desc: "Rules using it fall back to this scene's wallpaper as a legacy inline rule.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Delete scene")
                .setIcon("trash-2")
                .setDestructive()
                .onClick(() => this.deleteProfile(profile.id)),
            );
          },
        },
      ],
    };
  }

  private sceneAppearanceDefinitions(
    profile: VeilProfile,
    key: (field: string) => string,
  ): SettingDefinition<string>[] {
    return [
      {
        name: "Display mode",
        control: { type: "dropdown", key: key("displayMode"), options: DISPLAY_MODES },
      },
      this.slider(
        key("wallpaperPositionX"),
        "Horizontal focal point",
        "Scene-specific horizontal crop focus.",
      ),
      this.slider(
        key("wallpaperPositionY"),
        "Vertical focal point",
        "Scene-specific vertical crop focus.",
      ),
      this.rangeSlider(
        key("wallpaperZoom"),
        "Wallpaper zoom",
        "Scene-specific wallpaper zoom.",
        100,
        200,
        1,
        "%",
      ),
      this.rangeSlider(
        key("transitionDuration"),
        "Wallpaper transition",
        "Scene-specific crossfade duration, including pool shuffles.",
        0,
        2000,
        20,
        " ms",
      ),
      this.slider(key("opacity"), "Wallpaper opacity", "Scene-specific wallpaper opacity."),
      this.slider(
        key("paneOpacity"),
        "Pane background opacity",
        "Scene-specific pane surface opacity.",
      ),
      this.slider(
        key("paneContentOpacity"),
        "Pane & content opacity",
        "Scene-specific whole-pane opacity.",
      ),
      {
        name: "Vignette mode",
        control: {
          type: "dropdown",
          key: key("vignetteMode"),
          options: { off: "Off", ellipse: "Elliptical", circle: "Circular" },
        },
      },
      this.slider(
        key("vignetteIntensity"),
        "Vignette intensity",
        "Scene-specific edge shading strength.",
        100,
        "%",
        () => profile.vignetteMode === "off",
      ),
      this.slider(
        key("vignetteRadius"),
        "Vignette radius",
        "Scene-specific clear center before edge shading begins.",
        100,
        "%",
        () => profile.vignetteMode === "off",
      ),
      {
        name: "Blur",
        desc: "Blur this scene's wallpaper only.",
        control: { type: "toggle", key: key("blurEnabled") },
      },
      this.slider(
        key("blurIntensity"),
        "Blur intensity",
        "Scene-specific blur radius.",
        40,
        " px",
        () => !profile.blurEnabled,
      ),
      {
        name: "Dim",
        desc: "Reduce this scene's wallpaper brightness.",
        control: { type: "toggle", key: key("dimEnabled") },
      },
      this.slider(
        key("dimIntensity"),
        "Dim intensity",
        "Scene-specific dim strength.",
        100,
        "%",
        () => !profile.dimEnabled,
      ),
      {
        name: "Color overlay",
        desc: "Place a color layer over this scene's wallpaper.",
        control: { type: "toggle", key: key("colorOverlayEnabled") },
      },
      {
        name: "Overlay color",
        control: { type: "color", key: key("colorOverlayColor") },
        visible: () => profile.colorOverlayEnabled,
      },
      {
        ...this.slider(
          key("colorOverlayOpacity"),
          "Overlay opacity",
          "Scene-specific color overlay strength.",
          100,
          "%",
          () => !profile.colorOverlayEnabled,
        ),
        visible: () => profile.colorOverlayEnabled,
      },
      {
        name: "Overlay blend mode",
        control: {
          type: "dropdown",
          key: key("colorOverlayBlendMode"),
          options: COLOR_OVERLAY_BLEND_MODES,
        },
        visible: () => profile.colorOverlayEnabled,
      },
      {
        name: "Effect preset",
        desc: "Apply one optimized visual preset to this scene.",
        control: { type: "dropdown", key: key("effectPreset"), options: EFFECT_PRESETS },
      },
      this.slider(
        key("effectIntensity"),
        "Effect intensity",
        "Scene-specific effect strength and animation speed.",
        100,
        "%",
        () => profile.effectPreset === "none",
      ),
      {
        name: "Pause video when hidden",
        desc: "Avoid decoding this scene's video while its window is hidden.",
        control: { type: "toggle", key: key("pauseWhenHidden") },
      },
      {
        name: "Respect reduced motion",
        desc: "Pause video and motion-heavy effects, and disable crossfades when reduced motion is requested.",
        control: { type: "toggle", key: key("respectReducedMotion") },
      },
    ];
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
    return {
      type: "list",
      heading: "Wallpaper routing",
      cls: "veil-settings-panel-rules",
      emptyState: "No wallpaper rules. The default appearance applies everywhere.",
      items: this.plugin.settings.wallpaperRules.map((rule, index) =>
        this.wallpaperRulePage(rule, index)),
      addItem: {
        name: "Add wallpaper rule",
        action: () => {
          const wallpaperRules = [
            ...this.plugin.settings.wallpaperRules,
            createWallpaperRule(this.plugin.settings.wallpaperRules),
          ];
          this.plugin.updateSettings({ wallpaperRules });
          this.update();
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const wallpaperRules = [...this.plugin.settings.wallpaperRules];
        const [rule] = wallpaperRules.splice(oldIndex, 1);
        if (!rule) return;
        wallpaperRules.splice(newIndex, 0, rule);
        this.plugin.updateSettings({ wallpaperRules });
        this.update();
      },
      onDelete: (index) => {
        const rule = this.plugin.settings.wallpaperRules[index];
        if (rule) this.deleteWallpaperRule(rule.id);
      },
    };
  }

  private wallpaperRulePage(rule: WallpaperRule, index: number): SettingDefinitionPage<string> {
    const key = (field: string): string => `wallpaper-rule:${rule.id}:${field}`;
    const profile = rule.profileId ? this.findProfile(rule.profileId) : undefined;
    return {
      type: "page",
      name: rule.matchValue || `Wallpaper rule ${index + 1}`,
      desc: profile ? `Scene: ${profile.name}` : rule.wallpaperPath || "No appearance selected",
      displayValue: () => rule.enabled ? MATCH_TYPES[rule.matchType] : "Disabled",
      status: () => !rule.enabled || this.wallpaperRuleReady(rule) ? null : "warning",
      items: [
        ...this.matchRuleSettings(rule, key),
        {
          name: "Appearance source",
          desc: "A scene switches the complete appearance and may use a pool. Inline wallpaper preserves 1.3 behavior and changes only the media.",
          control: { type: "dropdown", key: key("profileId"), options: this.profileOptions() },
        },
        {
          name: "Wallpaper file",
          desc: "Inline mode uses global framing, opacity, effects, transition, and video settings, but not the global wallpaper pool.",
          control: {
            type: "file",
            key: key("wallpaperPath"),
            placeholder: "Media/Wallpapers/context.webp",
            filter: (file: TFile) => Boolean(mediaKind(file)),
          },
          visible: () => !rule.profileId,
        },
        {
          name: "Delete wallpaper rule",
          desc: "Remove this route from Veil.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Delete rule")
                .setIcon("trash-2")
                .setDestructive()
                .onClick(() => this.deleteWallpaperRule(rule.id)),
            );
          },
        },
      ],
    };
  }

  private opacityExclusionDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "list",
      heading: "Opacity exclusions",
      cls: "veil-settings-panel-rules",
      emptyState: "No exclusions. The resolved scene or global pane opacity applies everywhere.",
      items: this.plugin.settings.opacityExclusions.map((rule, index) =>
        this.opacityExclusionPage(rule, index)),
      addItem: {
        name: "Add opacity exclusion",
        action: () => {
          const opacityExclusions = [
            ...this.plugin.settings.opacityExclusions,
            createOpacityExclusionRule(this.plugin.settings.opacityExclusions),
          ];
          this.plugin.updateSettings({ opacityExclusions });
          this.update();
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const opacityExclusions = [...this.plugin.settings.opacityExclusions];
        const [rule] = opacityExclusions.splice(oldIndex, 1);
        if (!rule) return;
        opacityExclusions.splice(newIndex, 0, rule);
        this.plugin.updateSettings({ opacityExclusions });
        this.update();
      },
      onDelete: (index) => {
        const rule = this.plugin.settings.opacityExclusions[index];
        if (rule) this.deleteOpacityRule(rule.id);
      },
    };
  }

  private opacityExclusionPage(
    rule: OpacityExclusionRule,
    index: number,
  ): SettingDefinitionPage<string> {
    const key = (field: string): string => `opacity-rule:${rule.id}:${field}`;
    return {
      type: "page",
      name: rule.matchValue || `Opacity exclusion ${index + 1}`,
      desc: "Keep selected pane layers at full opacity in this context.",
      displayValue: () => rule.enabled ? MATCH_TYPES[rule.matchType] : "Disabled",
      status: () =>
        !rule.enabled || (rule.matchValue && (rule.excludePaneSurface || rule.excludePaneContent))
          ? null
          : "warning",
      items: [
        ...this.matchRuleSettings(rule, key),
        {
          name: "Exclude pane background opacity",
          desc: "Use a fully opaque pane surface instead of the resolved pane opacity.",
          control: { type: "toggle", key: key("excludePaneSurface") },
        },
        {
          name: "Exclude pane & content opacity",
          desc: "Keep nested backgrounds, text, icons, and images at full opacity.",
          control: { type: "toggle", key: key("excludePaneContent") },
        },
        {
          name: "Delete opacity exclusion",
          desc: "Remove this exclusion from Veil.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Delete rule")
                .setIcon("trash-2")
                .setDestructive()
                .onClick(() => this.deleteOpacityRule(rule.id)),
            );
          },
        },
      ],
    };
  }

  private matchRuleSettings(
    rule: ContextRule,
    key: (field: string) => string,
  ): SettingDefinition<string>[] {
    const textConfig = this.matchValueConfig(rule.matchType);
    return [
      { name: "Enabled", control: { type: "toggle", key: key("enabled") } },
      {
        name: "Match by",
        desc: "Folder rules include descendants; tag rules include nested tags; Property can match YAML/frontmatter or Veil system fallbacks for theme, day, and time.",
        control: { type: "dropdown", key: key("matchType"), options: MATCH_TYPES },
      },
      {
        name: "Exact file path",
        desc: "Choose one file in the vault.",
        control: { type: "file", key: key("matchValue"), placeholder: "Folder/Note.md" },
        visible: () => rule.matchType === "path",
      },
      {
        name: textConfig.name,
        desc: textConfig.desc,
        control: {
          type: "text",
          key: key("matchValue"),
          placeholder: textConfig.placeholder,
        },
        visible: () => rule.matchType !== "path",
      },
    ];
  }

  private matchValueConfig(matchType: MatchType): {
    name: string;
    desc: string;
    placeholder: string;
  } {
    if (matchType === "note") {
      return {
        name: "Note name",
        desc: "The note name is matched without requiring the .md extension.",
        placeholder: "Homepage",
      };
    }
    if (matchType === "folder") {
      return {
        name: "Folder path",
        desc: "Use a vault-relative folder path. Every descendant note is included.",
        placeholder: "Projects",
      };
    }
    if (matchType === "property") {
      return {
        name: "Property / system context",
        desc: "Use key=value or key for frontmatter. System fallbacks use @theme=dark, @time=22:00-06:00, @day=weekend, or @schedule=mon-fri 08:00-18:00. Normal note/path/folder/tag/frontmatter wallpaper rules always win before system fallbacks.",
        placeholder: "veil=focus",
      };
    }
    return {
      name: "Tag",
      desc: "A leading # is optional. Parent tags also match nested tags.",
      placeholder: "#media/movies",
    };
  }

  private effectsDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "group",
      heading: "Effects",
      cls: "veil-settings-panel-effects",
      items: [
        {
          name: "Vignette mode",
          desc: "Shade the edges using the active theme's shadow palette.",
          control: {
            type: "dropdown",
            key: "vignetteMode",
            options: { off: "Off", ellipse: "Elliptical", circle: "Circular" },
          },
        },
        this.slider(
          "vignetteIntensity",
          "Vignette intensity",
          "Strength of the edge shading.",
          100,
          "%",
          () => this.plugin.settings.vignetteMode === "off",
        ),
        this.slider(
          "vignetteRadius",
          "Vignette radius",
          "Clear center before shading begins.",
          100,
          "%",
          () => this.plugin.settings.vignetteMode === "off",
        ),
        {
          name: "Blur",
          desc: "Blur the wallpaper only. High values use more GPU resources.",
          control: { type: "toggle", key: "blurEnabled" },
        },
        this.slider(
          "blurIntensity",
          "Blur intensity",
          "Blur radius in pixels.",
          40,
          " px",
          () => !this.plugin.settings.blurEnabled,
        ),
        {
          name: "Dim",
          desc: "Reduce wallpaper brightness without dimming the interface.",
          control: { type: "toggle", key: "dimEnabled" },
        },
        this.slider(
          "dimIntensity",
          "Dim intensity",
          "0% keeps original brightness; 100% darkens completely.",
          100,
          "%",
          () => !this.plugin.settings.dimEnabled,
        ),
        {
          name: "Color overlay",
          desc: "Place a color layer over the wallpaper.",
          control: { type: "toggle", key: "colorOverlayEnabled" },
        },
        {
          name: "Overlay color",
          control: { type: "color", key: "colorOverlayColor" },
          visible: () => this.plugin.settings.colorOverlayEnabled,
        },
        {
          ...this.slider(
            "colorOverlayOpacity",
            "Overlay opacity",
            "Strength of the selected color layer.",
            100,
            "%",
            () => !this.plugin.settings.colorOverlayEnabled,
          ),
          visible: () => this.plugin.settings.colorOverlayEnabled,
        },
        {
          name: "Overlay blend mode",
          desc: "Color preserves image detail most closely; other modes alter brightness and contrast.",
          control: {
            type: "dropdown",
            key: "colorOverlayBlendMode",
            options: COLOR_OVERLAY_BLEND_MODES,
          },
          visible: () => this.plugin.settings.colorOverlayEnabled,
        },
        {
          name: "Effect preset",
          desc: "Apply one optimized preset at a time.",
          control: { type: "dropdown", key: "effectPreset", options: EFFECT_PRESETS },
        },
        this.slider(
          "effectIntensity",
          "Effect intensity",
          "Strength and animated update speed.",
          100,
          "%",
          () => this.plugin.settings.effectPreset === "none",
        ),
        {
          name: "Performance guide",
          desc: "Overlay, dim, and vignette are low cost. Retro is low to moderate. Blur is GPU-heavy at high radius. Glitch and TV noise animate continuously.",
          searchable: false,
        },
      ],
    };
  }

  private videoDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "group",
      heading: "Video playback",
      cls: "veil-settings-panel-video",
      items: [
        {
          name: "Video compatibility",
          desc: "Videos loop silently. Web formats work most broadly; other formats depend on codecs in the local Obsidian runtime.",
          searchable: false,
        },
        {
          name: "Pause video when the app is hidden",
          desc: "Avoid decoding video while a window is not visible.",
          control: { type: "toggle", key: "pauseWhenHidden" },
        },
        {
          name: "Respect reduced motion",
          desc: "Pause video and motion-heavy effects, and disable wallpaper crossfades when the operating system requests reduced motion. GIF files cannot be paused.",
          control: { type: "toggle", key: "respectReducedMotion" },
        },
      ],
    };
  }

  private actionsDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "group",
      heading: "Actions",
      cls: "veil-settings-panel-actions",
      items: [
        {
          name: "Open wallpaper library",
          desc: "Browse supported media with Favorites and Recently Selected filters.",
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
          name: "Reload wallpaper",
          desc: "Retry loading the current file or a video whose autoplay was blocked.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Reload")
                .onClick(() => this.plugin.refreshWallpaper(true)),
            );
          },
        },
        {
          name: "Shuffle wallpaper pool",
          desc: "Choose another wallpaper for the active default appearance or scene, avoiding the previous choice when possible.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Shuffle")
                .setIcon("shuffle")
                .onClick(() => this.plugin.shuffleWallpaperPool()),
            );
          },
        },
        {
          name: "Export settings",
          desc: "Download a schema-versioned JSON backup containing settings, scenes, and rules. Media files and local library history are not embedded.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Export")
                .setIcon("download")
                .onClick(() => this.exportSettings()),
            );
          },
        },
        {
          name: "Import settings",
          desc: "Replace the portable configuration with a validated backup. Schema 1 exports migrate automatically; local Favorites and Recently Selected remain local.",
          render: (setting) => {
            setting.addButton((button) =>
              button
                .setButtonText("Import")
                .setIcon("upload")
                .onClick(() => this.chooseImportFile()),
            );
          },
        },
        {
          name: "Restore defaults",
          desc: "Clear the wallpaper, scenes, and rules and restore default appearance values. Media files and local library metadata are not changed.",
          render: (setting) => {
            setting.addButton((button) =>
              button.setButtonText("Restore").onClick(() => {
                this.plugin.updateSettings({ ...DEFAULT_SETTINGS });
                void this.plugin.flushSettings().then(() => this.update());
              }),
            );
          },
        },
      ],
    };
  }

  private supportDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "group",
      heading: "Support Veil",
      cls: "veil-settings-panel-support",
      items: [{
        name: "Buy me a coffee",
        desc: "If Veil is useful to you, you can support its continued development.",
        searchable: false,
        render: (setting) => {
          const link = setting.controlEl.createEl("a", {
            cls: "veil-support-link",
            attr: {
              href: FUNDING_URL,
              target: "_blank",
              rel: "noopener noreferrer",
              "aria-label": "Buy me a coffee",
            },
          });
          const icon = link.createSpan({ cls: "veil-support-link-icon" });
          setIcon(icon, "coffee");
          link.createSpan({ cls: "veil-support-link-label", text: "Buy me a coffee" });
        },
      }],
    };
  }

  private profileOptions(): Record<string, string> {
    const options: Record<string, string> = {
      "": "Inline wallpaper — use global appearance",
    };
    for (const profile of this.plugin.settings.profiles) {
      options[profile.id] = profile.name || profile.id;
    }
    return options;
  }

  private wallpaperRuleReady(rule: WallpaperRule): boolean {
    if (!rule.matchValue) return false;
    const profile = rule.profileId ? this.findProfile(rule.profileId) : undefined;
    const path = profile?.wallpaperPath || rule.wallpaperPath;
    if (!path) return false;
    const file = this.app.vault.getFileByPath(normalizePath(path));
    return Boolean(file && mediaKind(file));
  }

  private parseRuleKey(key: string): { kind: RuleKind; id: string; field: string } | null {
    const [prefix, id, ...fieldParts] = key.split(":");
    if (!id || fieldParts.length === 0) return null;
    if (prefix !== "wallpaper-rule" && prefix !== "opacity-rule") return null;
    return {
      kind: prefix === "wallpaper-rule" ? "wallpaper" : "opacity",
      id,
      field: fieldParts.join(":"),
    };
  }

  private parseProfileKey(key: string): { id: string; field: string } | null {
    const [prefix, id, ...fieldParts] = key.split(":");
    if (prefix !== "profile" || !id || fieldParts.length === 0) return null;
    return { id, field: fieldParts.join(":") };
  }

  private findRule(
    kind: RuleKind,
    id: string,
  ): WallpaperRule | OpacityExclusionRule | undefined {
    return kind === "wallpaper"
      ? this.plugin.settings.wallpaperRules.find((rule) => rule.id === id)
      : this.plugin.settings.opacityExclusions.find((rule) => rule.id === id);
  }

  private findProfile(id: string): VeilProfile | undefined {
    return this.plugin.settings.profiles.find((profile) => profile.id === id);
  }

  private setRuleValue(
    rule: WallpaperRule | OpacityExclusionRule,
    field: string,
    value: unknown,
  ): void {
    if (field === "enabled") {
      rule.enabled = value === true;
      return;
    }
    if (field === "excludePaneSurface" && "excludePaneSurface" in rule) {
      rule.excludePaneSurface = value === true;
      return;
    }
    if (field === "excludePaneContent" && "excludePaneContent" in rule) {
      rule.excludePaneContent = value === true;
      return;
    }
    if (field === "matchType") {
      rule.matchType = Object.keys(MATCH_TYPES).includes(String(value))
        ? value as MatchType
        : "path";
      return;
    }
    if (field === "matchValue") {
      rule.matchValue = typeof value === "string" ? value : "";
      return;
    }
    if (field === "profileId" && "profileId" in rule) {
      rule.profileId = typeof value === "string" ? value : "";
      return;
    }
    if (field === "wallpaperPath" && "wallpaperPath" in rule) {
      rule.wallpaperPath = typeof value === "string" ? value : "";
    }
  }

  private copyGlobalAppearanceToProfile(id: string): void {
    const current = this.findProfile(id);
    if (!current) return;
    const copied = createProfile([], this.plugin.settings);
    const profile: VeilProfile = { ...copied, id: current.id, name: current.name };
    const profiles = this.plugin.settings.profiles.map((candidate) =>
      candidate.id === id ? profile : candidate);
    this.plugin.updateSettings({ profiles });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private deleteProfile(id: string): void {
    const profile = this.findProfile(id);
    if (!profile) return;
    const profiles = this.plugin.settings.profiles.filter((candidate) => candidate.id !== id);
    const wallpaperRules = this.plugin.settings.wallpaperRules.map((rule) =>
      rule.profileId === id
        ? { ...rule, profileId: "", wallpaperPath: profile.wallpaperPath }
        : rule,
    );
    this.plugin.updateSettings({ profiles, wallpaperRules });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private deleteWallpaperRule(id: string): void {
    const wallpaperRules = this.plugin.settings.wallpaperRules.filter((rule) => rule.id !== id);
    if (wallpaperRules.length === this.plugin.settings.wallpaperRules.length) return;
    this.plugin.updateSettings({ wallpaperRules });
    void this.plugin.flushSettings().then(() => this.update());
  }

  private deleteOpacityRule(id: string): void {
    const opacityExclusions = this.plugin.settings.opacityExclusions.filter((rule) => rule.id !== id);
    if (opacityExclusions.length === this.plugin.settings.opacityExclusions.length) return;
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
