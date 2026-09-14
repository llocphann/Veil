import type { App, SettingDefinitionItem, TFile } from "obsidian";
import {
  DISPLAY_MODES,
  mediaKind,
  type VeilSettings,
} from "./settings";
import type {
  RangeSliderFactory,
  SliderFactory,
} from "./settings-appearance-definitions";
import { renderVaultFolderControl } from "./settings-folder-picker";

export interface WallpaperDefinitionActions {
  openWallpaperLibrary: () => void;
  setControlValue: (key: string, value: unknown) => void;
  bindWallpaperStatus: (descEl: HTMLElement, settingEl: HTMLElement) => () => void;
  activeContextSummary: () => string;
  bindActiveContext: (descEl: HTMLElement) => () => void;
}

export function createWallpaperDefinitions(
  app: App,
  settings: VeilSettings,
  actions: WallpaperDefinitionActions,
  slider: SliderFactory,
  rangeSlider: RangeSliderFactory,
): SettingDefinitionItem<string> {
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
        desc: "Choose an image, GIF, or video from this vault.",
        control: {
          type: "file",
          key: "wallpaperPath",
          placeholder: "Media/Wallpapers/example.webp",
          filter: (file: TFile) => Boolean(mediaKind(file)),
        },
        visible: () => !settings.wallpaperPoolEnabled,
      },
      {
        name: "Wallpaper library",
        desc: "Browse all supported vault media visually, search paths, and manage favorites or recently selected files.",
        render: (setting) => {
          setting.addButton((button) =>
            button
              .setButtonText("Open library")
              .setIcon("images")
              .onClick(actions.openWallpaperLibrary),
          );
        },
        visible: () => !settings.wallpaperPoolEnabled,
      },
      {
        name: "Wallpaper pool",
        desc: "Randomly choose supported media from a wallpaper folder.",
        control: { type: "toggle", key: "wallpaperPoolEnabled" },
      },
      {
        name: "Wallpaper folder",
        desc: "Choose the vault folder used by the wallpaper pool.",
        render: (setting) => renderVaultFolderControl(
          app,
          setting,
          settings.wallpaperPoolFolder,
          (path) => actions.setControlValue("wallpaperPoolFolder", path),
        ),
        visible: () => settings.wallpaperPoolEnabled,
      },
      {
        name: "Include subfolders",
        desc: "Also include supported media in descendant folders.",
        control: { type: "toggle", key: "wallpaperPoolIncludeSubfolders" },
        visible: () => settings.wallpaperPoolEnabled,
      },
      {
        name: "Change interval",
        desc: "Automatically choose another pool wallpaper every 5 to 120 minutes.",
        control: {
          type: "slider",
          key: "wallpaperPoolChangeInterval",
          min: 5,
          max: 120,
          step: 1,
          displayFormat: (value) => `${value} min`,
        },
        visible: () => settings.wallpaperPoolEnabled,
      },
      {
        name: "Wallpaper status",
        desc: "Waiting for the workspace…",
        searchable: false,
        render: (setting) => {
          setting.settingEl.classList.add("vault-dashboard-wallpaper-status");
          setting.descEl.setAttribute("role", "status");
          setting.descEl.setAttribute("aria-live", "polite");
          return actions.bindWallpaperStatus(setting.descEl, setting.settingEl);
        },
      },
      {
        name: "Display mode",
        desc: "The same sizing rules apply to every supported media type.",
        control: { type: "dropdown", key: "displayMode", options: DISPLAY_MODES },
      },
      slider(
        "wallpaperPositionX",
        "Horizontal focal point",
        "Move the crop focus from the left edge (0%) to the right edge (100%).",
      ),
      slider(
        "wallpaperPositionY",
        "Vertical focal point",
        "Move the crop focus from the top edge (0%) to the bottom edge (100%).",
      ),
      rangeSlider(
        "wallpaperZoom",
        "Wallpaper zoom",
        "Zoom into the wallpaper while keeping the selected focal point anchored.",
        100,
        200,
        1,
        "%",
      ),
      rangeSlider(
        "transitionDuration",
        "Wallpaper transition",
        "Crossfade duration for rule, scene, and pool changes. Set to 0 for an instant switch.",
        0,
        2000,
        20,
        " ms",
      ),
      slider(
        "opacity",
        "Wallpaper opacity",
        "0% hides the wallpaper; 100% shows its full opacity.",
      ),
      slider(
        "paneOpacity",
        "Pane background opacity",
        "Lower values reveal more wallpaper without fading pane content.",
      ),
      slider(
        "paneContentOpacity",
        "Pane & content opacity",
        "Fade each outer pane as one group, including nested backgrounds, text, icons, and images.",
      ),
    ],
  };
}

export function createActiveContextDefinition(
  actions: WallpaperDefinitionActions,
): SettingDefinitionItem<string> {
  return {
    type: "group",
    heading: "Active context",
    cls: "veil-settings-panel-rules",
    items: [{
      name: "Resolved appearance",
      desc: actions.activeContextSummary(),
      searchable: false,
      render: (setting) => {
        setting.descEl.setAttribute("role", "status");
        setting.descEl.setAttribute("aria-live", "polite");
        return actions.bindActiveContext(setting.descEl);
      },
    }],
  };
}
