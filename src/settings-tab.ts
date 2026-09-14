import { PluginSettingTab, normalizePath, setIcon } from "obsidian";
import type {
  App,
  SettingDefinition,
  SettingDefinitionItem,
  TFile,
} from "obsidian";
import type VeilPlugin from "./main";
import {
  DEFAULT_SETTINGS,
  DISPLAY_MODES,
  mediaKind,
  normalizeSettings,
  type VeilSettings,
} from "./settings";

const FUNDING_URL = "https://www.buymeacoffee.com/llocphann";

type SettingKey = keyof VeilSettings;
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

  constructor(app: App, plugin: VeilPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getControlValue(key: string): unknown {
    if (!(key in DEFAULT_SETTINGS)) return undefined;
    return this.plugin.settings[key as SettingKey];
  }

  setControlValue(key: string, value: unknown): void {
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
  ): SettingDefinition<SettingKey> {
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

  getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
    return [
      {
        type: "group",
        heading: "Wallpaper",
        cls: "vault-dashboard-background-settings",
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
      {
        type: "group",
        heading: "Effects",
        cls: "vault-dashboard-background-settings",
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
        cls: "vault-dashboard-background-settings",
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
        cls: "vault-dashboard-background-settings",
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
        cls: "vault-dashboard-background-settings",
        items: [
          {
            name: "Buy me a coffee",
            desc: "If Veil is useful to you, you can support its continued development.",
            searchable: false,
            render: (setting) => {
              const link = setting.controlEl.createEl("a", {
                cls: "mod-cta veil-support-link",
                attr: {
                  href: FUNDING_URL,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  "aria-label": "Buy me a coffee",
                },
              });
              const icon = link.createSpan({ cls: "veil-support-link-icon" });
              setIcon(icon, "coffee");
              link.createSpan({ text: "Buy me a coffee" });
            },
          },
        ],
      },
    ];
  }

  hide(): void {
    this.statusEl = null;
    this.statusRowEl = null;
    void this.plugin.flushSettings();
  }
}
