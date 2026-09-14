import { normalizePath } from "obsidian";
import type {
  App,
  SettingDefinitionItem,
  SettingDefinitionPage,
  TFile,
} from "obsidian";
import {
  createSceneAppearanceDefinitions,
  type RangeSliderFactory,
  type SliderFactory,
} from "./settings-appearance-definitions";
import {
  mediaKind,
  type VeilProfile,
  type VeilSettings,
} from "./settings";

export interface SceneDefinitionActions {
  addScene: () => void;
  reorderScene: (oldIndex: number, newIndex: number) => void;
  deleteScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  copyGlobalAppearanceToScene: (id: string) => void;
}

export function createSceneDefinitions(
  app: App,
  settings: VeilSettings,
  actions: SceneDefinitionActions,
  slider: SliderFactory,
  rangeSlider: RangeSliderFactory,
): SettingDefinitionItem<string> {
  return {
    type: "list",
    heading: "Scenes",
    cls: "veil-settings-panel-rules",
    emptyState: "No scenes. Create one from the current appearance, then route notes to it below.",
    items: settings.profiles.map((profile, index) =>
      scenePage(app, profile, index, actions, slider, rangeSlider)),
    addItem: {
      name: "Add scene from current appearance",
      action: actions.addScene,
    },
    onReorder: actions.reorderScene,
    onDelete: (index) => {
      const profile = settings.profiles[index];
      if (profile) actions.deleteScene(profile.id);
    },
  };
}

function scenePage(
  app: App,
  profile: VeilProfile,
  index: number,
  actions: SceneDefinitionActions,
  slider: SliderFactory,
  rangeSlider: RangeSliderFactory,
): SettingDefinitionPage<string> {
  const key = (field: string): string => `profile:${profile.id}:${field}`;
  const file = profile.wallpaperPath
    ? app.vault.getFileByPath(normalizePath(profile.wallpaperPath))
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
      ...createSceneAppearanceDefinitions(profile, key, slider, rangeSlider),
      {
        name: "Duplicate scene",
        desc: "Create an independent copy of this scene with a new ID and the same wallpaper, pool, appearance, transition, and video settings.",
        render: (setting) => {
          setting.addButton((button) =>
            button
              .setButtonText("Duplicate")
              .setIcon("copy")
              .onClick(() => actions.duplicateScene(profile.id)),
          );
        },
      },
      {
        name: "Copy current global appearance",
        desc: "Replace this scene's wallpaper, pool, framing, opacity, effects, transition, and video behavior with the current global appearance while keeping its name.",
        render: (setting) => {
          setting.addButton((button) =>
            button
              .setButtonText("Copy current")
              .onClick(() => actions.copyGlobalAppearanceToScene(profile.id)),
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
              .onClick(() => actions.deleteScene(profile.id)),
          );
        },
      },
    ],
  };
}
