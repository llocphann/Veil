import { PluginSettingTab, normalizePath, setIcon } from "obsidian";
import type {
  App,
  SettingDefinition,
  SettingDefinitionItem,
  SettingDefinitionPage,
  TFile,
} from "obsidian";
import type VeilPlugin from "./main";
import {
  DEFAULT_SETTINGS,
  DISPLAY_MODES,
  MATCH_TYPES,
  createOpacityExclusionRule,
  createWallpaperRule,
  mediaKind,
  normalizeSettings,
  type ContextRule,
  type MatchType,
  type OpacityExclusionRule,
  type VeilSettings,
  type WallpaperRule,
} from "./settings";

const FUNDING_URL = "https://www.buymeacoffee.com/llocphann";
const SETTINGS_TABS = [
  { id: "wallpaper", label: "Wallpaper", icon: "image" },
  { id: "rules", label: "Rules", icon: "list-filter" },
  { id: "effects", label: "Effects", icon: "sparkles" },
  { id: "video", label: "Video", icon: "video" },
  { id: "actions", label: "Actions", icon: "rotate-ccw" },
  { id: "support", label: "Support", icon: "heart" },
] as const;

type SettingKey = keyof VeilSettings;
type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];
type NumericSettingKey =
  | "opacity"
  | "paneOpacity"
  | "paneContentOpacity"
  | "vignetteIntensity"
  | "vignetteRadius"
  | "blurIntensity"
  | "dimIntensity";

export class WallpaperSettingsTab extends PluginSettingTab {
  private readonly plugin: VeilPlugin;
  private statusEl: HTMLElement | null = null;
  private statusRowEl: HTMLElement | null = null;
  private activeTab: SettingsTabId = "wallpaper";

  constructor(app: App, plugin: VeilPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getControlValue(key: string): unknown {
    const ruleKey = this.parseRuleKey(key);
    if (ruleKey) {
      const rule = this.findRule(ruleKey.kind, ruleKey.id);
      return rule?.[ruleKey.field as keyof typeof rule];
    }
    if (!(key in DEFAULT_SETTINGS)) return undefined;
    return this.plugin.settings[key as SettingKey];
  }

  setControlValue(key: string, value: unknown): void {
    const ruleKey = this.parseRuleKey(key);
    if (ruleKey) {
      const rule = this.findRule(ruleKey.kind, ruleKey.id);
      if (!rule) return;
      this.setRuleValue(rule, ruleKey.field, value);
      this.plugin.updateSettings({
        wallpaperRules: this.plugin.settings.wallpaperRules,
        opacityExclusions: this.plugin.settings.opacityExclusions,
      });
      if (["matchType", "enabled", "excludePaneSurface", "excludePaneContent"].includes(
        ruleKey.field,
      )) {
        this.update();
      }
      return;
    }
    if (!(key in DEFAULT_SETTINGS)) return;
    const settings = normalizeSettings(
      { ...this.plugin.settings, [key]: value },
      normalizePath,
    );
    this.plugin.updateSettings(settings);
    this.refreshDomState();
  }

  updateStatus(): void {
    if (!this.statusEl?.isConnected || !this.statusRowEl?.isConnected) return;
    this.statusEl.textContent = this.plugin.status.message;
    this.statusRowEl.dataset.tone = this.plugin.status.tone;
  }

  private numberSetting(
    key: NumericSettingKey,
    name: string,
    desc: string,
    maximum = 100,
    unit = "%",
    disabled?: () => boolean,
  ): SettingDefinition<string> {
    return {
      name,
      desc,
      control: {
        type: "slider",
        key,
        min: 0,
        max: maximum,
        step: 1,
        displayFormat: (value) => `${value}${unit}`,
        disabled,
      },
    };
  }

  private tabNavigationDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "group",
      cls: "veil-settings-tabs-group",
      items: [
        {
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
              if (!new Set(["ArrowLeft", "ArrowRight", "Home", "End"]).has(event.key)) {
                return;
              }
              const currentIndex = this.documentActiveButtonIndex(buttons);
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
        },
      ],
    };
  }

  getSettingDefinitions(): SettingDefinitionItem<string>[] {
    return [
      this.tabNavigationDefinitions(),
      {
        type: "group",
        heading: "Wallpaper",
        cls: "veil-settings-panel-wallpaper",
        items: [
          {
            name: "Live preview",
            desc: "Changes preview immediately. Wallpaper effects stay behind the interface. Pane and content opacity can also fade nested pane backgrounds and content.",
            searchable: false,
          },
          {
            name: "Enable wallpaper",
            desc: "Restore the theme's normal background when turned off.",
            control: { type: "toggle", key: "enabled" },
          },
          {
            name: "Wallpaper file",
            desc: "Choose an image, GIF, or video from this vault, or enter its vault-relative path.",
            control: {
              type: "file",
              key: "wallpaperPath",
              placeholder: "Media/Wallpapers/example.webp",
              filter: (file: TFile) => Boolean(mediaKind(file)),
            },
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
            control: {
              type: "dropdown",
              key: "displayMode",
              options: DISPLAY_MODES,
            },
          },
          this.numberSetting(
            "opacity",
            "Wallpaper opacity",
            "0% hides the wallpaper; 100% shows its full opacity.",
          ),
          this.numberSetting(
            "paneOpacity",
            "Pane background opacity",
            "Lower values reveal more wallpaper without fading pane content.",
          ),
          this.numberSetting(
            "paneContentOpacity",
            "Pane & content opacity",
            "Fade each pane as one group, including nested backgrounds, text, icons, and images. Settings and menus outside panes remain visible.",
          ),
        ],
      },
      this.wallpaperRuleDefinitions(),
      this.opacityExclusionDefinitions(),
      {
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
          this.numberSetting(
            "vignetteIntensity",
            "Vignette intensity",
            "Strength of the edge shading.",
            100,
            "%",
            () => this.plugin.settings.vignetteMode === "off",
          ),
          this.numberSetting(
            "vignetteRadius",
            "Vignette radius",
            "Clear center before shading begins. A larger radius leaves more of the center untouched.",
            100,
            "%",
            () => this.plugin.settings.vignetteMode === "off",
          ),
          {
            name: "Blur",
            desc: "Blur the wallpaper only. High values use more GPU resources.",
            control: { type: "toggle", key: "blurEnabled" },
          },
          this.numberSetting(
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
          this.numberSetting(
            "dimIntensity",
            "Dim intensity",
            "0% keeps the original brightness; 100% darkens the wallpaper completely.",
            100,
            "%",
            () => !this.plugin.settings.dimEnabled,
          ),
        ],
      },
      {
        type: "group",
        heading: "Video playback",
        cls: "veil-settings-panel-video",
        items: [
          {
            name: "Video compatibility",
            desc: "Videos loop silently. Common web video formats work most broadly; other formats depend on codecs available in the local Obsidian installation. Animated images remain image elements.",
            searchable: false,
          },
          {
            name: "Pause video when the app is hidden",
            desc: "Avoid decoding video when a window is not visible.",
            control: { type: "toggle", key: "pauseWhenHidden" },
          },
          {
            name: "Respect reduced motion",
            desc: "Pause video on a still frame when the operating system requests reduced motion. This setting cannot pause GIF files.",
            control: { type: "toggle", key: "respectReducedMotion" },
          },
        ],
      },
      {
        type: "group",
        heading: "Actions",
        cls: "veil-settings-panel-actions",
        items: [
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
            name: "Restore defaults",
            desc: "Clear the selected wallpaper, restore the default opacity values, and turn effects off. No media files are changed.",
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
      },
      {
        type: "group",
        heading: "Support Veil",
        cls: "veil-settings-panel-support",
        items: [
          {
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
          },
        ],
      },
    ];
  }

  private documentActiveButtonIndex(buttons: HTMLButtonElement[]): number {
    const activeElement = this.containerEl.ownerDocument.activeElement;
    return Math.max(0, buttons.findIndex((button) => button === activeElement));
  }

  private wallpaperRuleDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "list",
      heading: "Wallpaper routing",
      cls: "veil-settings-panel-rules",
      emptyState: "No wallpaper rules. The default wallpaper applies everywhere.",
      items: this.plugin.settings.wallpaperRules.map((rule, index) =>
        this.wallpaperRulePage(rule, index)),
      addItem: {
        name: "Add wallpaper rule",
        action: () => {
          this.plugin.settings.wallpaperRules.push(
            createWallpaperRule(this.plugin.settings.wallpaperRules),
          );
          this.plugin.updateSettings({ wallpaperRules: this.plugin.settings.wallpaperRules });
          this.update();
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const [rule] = this.plugin.settings.wallpaperRules.splice(oldIndex, 1);
        if (!rule) return;
        this.plugin.settings.wallpaperRules.splice(newIndex, 0, rule);
        this.plugin.updateSettings({ wallpaperRules: this.plugin.settings.wallpaperRules });
        this.update();
      },
      onDelete: (index) => {
        this.plugin.settings.wallpaperRules.splice(index, 1);
        this.plugin.updateSettings({ wallpaperRules: this.plugin.settings.wallpaperRules });
        this.update();
      },
    };
  }

  private opacityExclusionDefinitions(): SettingDefinitionItem<string> {
    return {
      type: "list",
      heading: "Opacity exclusions",
      cls: "veil-settings-panel-rules",
      emptyState: "No exclusions. Global pane opacity applies everywhere.",
      items: this.plugin.settings.opacityExclusions.map((rule, index) =>
        this.opacityExclusionPage(rule, index)),
      addItem: {
        name: "Add opacity exclusion",
        action: () => {
          this.plugin.settings.opacityExclusions.push(
            createOpacityExclusionRule(this.plugin.settings.opacityExclusions),
          );
          this.plugin.updateSettings({ opacityExclusions: this.plugin.settings.opacityExclusions });
          this.update();
        },
      },
      onReorder: (oldIndex, newIndex) => {
        const [rule] = this.plugin.settings.opacityExclusions.splice(oldIndex, 1);
        if (!rule) return;
        this.plugin.settings.opacityExclusions.splice(newIndex, 0, rule);
        this.plugin.updateSettings({ opacityExclusions: this.plugin.settings.opacityExclusions });
        this.update();
      },
      onDelete: (index) => {
        this.plugin.settings.opacityExclusions.splice(index, 1);
        this.plugin.updateSettings({ opacityExclusions: this.plugin.settings.opacityExclusions });
        this.update();
      },
    };
  }

  private wallpaperRulePage(rule: WallpaperRule, index: number): SettingDefinitionPage<string> {
    const key = (field: string): string => `wallpaper-rule:${rule.id}:${field}`;
    return {
      type: "page",
      name: rule.matchValue || `Wallpaper rule ${index + 1}`,
      desc: rule.wallpaperPath || "No wallpaper selected",
      displayValue: () => rule.enabled ? MATCH_TYPES[rule.matchType] : "Disabled",
      status: () => !rule.enabled || this.wallpaperRuleReady(rule) ? null : "warning",
      items: [
        ...this.matchRuleSettings(rule, key),
        {
          name: "Wallpaper file",
          desc: "This wallpaper replaces the default when the rule is the first enabled match.",
          control: {
            type: "file",
            key: key("wallpaperPath"),
            placeholder: "Media/Wallpapers/context.webp",
            filter: (file: TFile) => Boolean(mediaKind(file)),
          },
        },
      ],
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
      status: () => !rule.enabled || (rule.matchValue
        && (rule.excludePaneSurface || rule.excludePaneContent))
        ? null
        : "warning",
      items: [
        ...this.matchRuleSettings(rule, key),
        {
          name: "Exclude pane background opacity",
          desc: "Use a fully opaque pane surface instead of the global pane background opacity.",
          control: { type: "toggle", key: key("excludePaneSurface") },
        },
        {
          name: "Exclude pane & content opacity",
          desc: "Keep nested backgrounds, text, icons, and images at full opacity.",
          control: { type: "toggle", key: key("excludePaneContent") },
        },
      ],
    };
  }

  private matchRuleSettings(
    rule: ContextRule,
    key: (field: string) => string,
  ): SettingDefinition<string>[] {
    return [
      {
        name: "Enabled",
        control: { type: "toggle", key: key("enabled") },
      },
      {
        name: "Match by",
        desc: "Tag rules also match nested tags. Folder rules include every descendant file.",
        control: { type: "dropdown", key: key("matchType"), options: MATCH_TYPES },
      },
      {
        name: "Exact file path",
        desc: "Choose one file in the vault.",
        control: {
          type: "file",
          key: key("matchValue"),
          placeholder: "Folder/Note.md",
        },
        visible: () => rule.matchType === "path",
      },
      {
        name: rule.matchType === "note"
          ? "Note name"
          : rule.matchType === "folder"
            ? "Folder path"
            : "Tag",
        desc: rule.matchType === "note"
          ? "The note name is matched without requiring the .md extension."
          : rule.matchType === "folder"
            ? "Use a vault-relative folder path."
            : "A leading # is optional.",
        control: {
          type: "text",
          key: key("matchValue"),
          placeholder: rule.matchType === "note"
            ? "Homepage"
            : rule.matchType === "folder"
              ? "20_Personal_Life/25_Media_Tracker"
              : "#media/movies",
        },
        visible: () => rule.matchType !== "path",
      },
    ];
  }

  private wallpaperRuleReady(rule: WallpaperRule): boolean {
    if (!rule.matchValue || !rule.wallpaperPath) return false;
    const file = this.app.vault.getFileByPath(normalizePath(rule.wallpaperPath));
    return Boolean(file && mediaKind(file));
  }

  private parseRuleKey(
    key: string,
  ): { kind: "wallpaper" | "opacity"; id: string; field: string } | null {
    const [prefix, id, ...fieldParts] = key.split(":");
    if (!id || fieldParts.length === 0) return null;
    if (prefix !== "wallpaper-rule" && prefix !== "opacity-rule") return null;
    return {
      kind: prefix === "wallpaper-rule" ? "wallpaper" : "opacity",
      id,
      field: fieldParts.join(":"),
    };
  }

  private findRule(
    kind: "wallpaper" | "opacity",
    id: string,
  ): WallpaperRule | OpacityExclusionRule | undefined {
    return kind === "wallpaper"
      ? this.plugin.settings.wallpaperRules.find((rule) => rule.id === id)
      : this.plugin.settings.opacityExclusions.find((rule) => rule.id === id);
  }

  private setRuleValue(
    rule: WallpaperRule | OpacityExclusionRule,
    field: string,
    value: unknown,
  ): void {
    if (["enabled", "excludePaneSurface", "excludePaneContent"].includes(field)) {
      if (field in rule) rule[field as "enabled"] = value === true;
      return;
    }
    if (field === "matchType") {
      rule.matchType = Object.keys(MATCH_TYPES).includes(String(value))
        ? value as MatchType
        : "path";
      return;
    }
    if (field === "matchValue") rule.matchValue = typeof value === "string" ? value : "";
    if (field === "wallpaperPath" && "wallpaperPath" in rule) {
      rule.wallpaperPath = typeof value === "string" ? value : "";
    }
  }

  hide(): void {
    this.statusEl = null;
    this.statusRowEl = null;
    void this.plugin.flushSettings();
  }
}
