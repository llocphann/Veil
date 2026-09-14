import { setIcon } from "obsidian";
import type { SettingDefinitionItem } from "obsidian";

const FUNDING_URL = "https://www.buymeacoffee.com/llocphann";

export interface SettingsActionDefinitionsActions {
  openWallpaperLibrary: () => void;
  reloadWallpaper: () => void;
  shuffleWallpaperPool: () => void;
  exportSettings: () => void;
  importSettings: () => void;
  restoreDefaults: () => void;
}

export function createActionsDefinitions(
  actions: SettingsActionDefinitionsActions,
): SettingDefinitionItem<string> {
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
              .onClick(actions.openWallpaperLibrary),
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
              .onClick(actions.reloadWallpaper),
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
              .onClick(actions.shuffleWallpaperPool),
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
              .onClick(actions.exportSettings),
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
              .onClick(actions.importSettings),
          );
        },
      },
      {
        name: "Restore defaults",
        desc: "Clear the wallpaper, scenes, and rules and restore default appearance values. Media files and local library metadata are not changed.",
        render: (setting) => {
          setting.addButton((button) =>
            button.setButtonText("Restore").onClick(actions.restoreDefaults),
          );
        },
      },
    ],
  };
}

export function createSupportDefinitions(): SettingDefinitionItem<string> {
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
