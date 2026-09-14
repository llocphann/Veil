import { normalizePath } from "obsidian";
import type {
  App,
  SettingDefinition,
  SettingDefinitionItem,
  SettingDefinitionPage,
  TFile,
} from "obsidian";
import { contextRuleSyntaxValid } from "./context-rules";
import {
  MATCH_TYPES,
  mediaKind,
  type ContextRule,
  type MatchType,
  type OpacityExclusionRule,
  type VeilSettings,
  type WallpaperRule,
} from "./settings";

export interface RoutingDefinitionActions {
  addWallpaperRule: () => void;
  reorderWallpaperRule: (oldIndex: number, newIndex: number) => void;
  deleteWallpaperRule: (id: string) => void;
  addOpacityExclusion: () => void;
  reorderOpacityExclusion: (oldIndex: number, newIndex: number) => void;
  deleteOpacityRule: (id: string) => void;
}

export function createWallpaperRuleDefinitions(
  app: App,
  settings: VeilSettings,
  actions: RoutingDefinitionActions,
): SettingDefinitionItem<string> {
  return {
    type: "list",
    heading: "Wallpaper routing",
    cls: "veil-settings-panel-rules",
    emptyState: "No wallpaper rules. The default appearance applies everywhere.",
    items: settings.wallpaperRules.map((rule, index) =>
      wallpaperRulePage(app, settings, rule, index, actions)),
    addItem: {
      name: "Add wallpaper rule",
      action: actions.addWallpaperRule,
    },
    onReorder: actions.reorderWallpaperRule,
    onDelete: (index) => {
      const rule = settings.wallpaperRules[index];
      if (rule) actions.deleteWallpaperRule(rule.id);
    },
  };
}

export function createOpacityExclusionDefinitions(
  settings: VeilSettings,
  actions: RoutingDefinitionActions,
): SettingDefinitionItem<string> {
  return {
    type: "list",
    heading: "Opacity exclusions",
    cls: "veil-settings-panel-rules",
    emptyState: "No exclusions. The resolved scene or global pane opacity applies everywhere.",
    items: settings.opacityExclusions.map((rule, index) =>
      opacityExclusionPage(rule, index, actions)),
    addItem: {
      name: "Add opacity exclusion",
      action: actions.addOpacityExclusion,
    },
    onReorder: actions.reorderOpacityExclusion,
    onDelete: (index) => {
      const rule = settings.opacityExclusions[index];
      if (rule) actions.deleteOpacityRule(rule.id);
    },
  };
}

function wallpaperRulePage(
  app: App,
  settings: VeilSettings,
  rule: WallpaperRule,
  index: number,
  actions: RoutingDefinitionActions,
): SettingDefinitionPage<string> {
  const key = (field: string): string => `wallpaper-rule:${rule.id}:${field}`;
  const profile = rule.profileId
    ? settings.profiles.find((candidate) => candidate.id === rule.profileId)
    : undefined;
  return {
    type: "page",
    name: rule.matchValue || `Wallpaper rule ${index + 1}`,
    desc: profile ? `Scene: ${profile.name}` : rule.wallpaperPath || "No appearance selected",
    displayValue: () => rule.enabled ? MATCH_TYPES[rule.matchType] : "Disabled",
    status: () => !rule.enabled || wallpaperRuleReady(app, settings, rule) ? null : "warning",
    items: [
      ...matchRuleSettings(rule, key),
      {
        name: "Appearance source",
        desc: "A scene switches the complete appearance and may use a pool. Inline wallpaper preserves 1.3 behavior and changes only the media.",
        control: { type: "dropdown", key: key("profileId"), options: profileOptions(settings) },
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
              .onClick(() => actions.deleteWallpaperRule(rule.id)),
          );
        },
      },
    ],
  };
}

function opacityExclusionPage(
  rule: OpacityExclusionRule,
  index: number,
  actions: RoutingDefinitionActions,
): SettingDefinitionPage<string> {
  const key = (field: string): string => `opacity-rule:${rule.id}:${field}`;
  return {
    type: "page",
    name: rule.matchValue || `Opacity exclusion ${index + 1}`,
    desc: "Keep selected pane layers at full opacity in this context.",
    displayValue: () => rule.enabled ? MATCH_TYPES[rule.matchType] : "Disabled",
    status: () =>
      !rule.enabled || (
        contextRuleSyntaxValid(rule)
        && (rule.excludePaneSurface || rule.excludePaneContent)
      )
        ? null
        : "warning",
    items: [
      ...matchRuleSettings(rule, key),
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
              .onClick(() => actions.deleteOpacityRule(rule.id)),
          );
        },
      },
    ],
  };
}

function matchRuleSettings(
  rule: ContextRule,
  key: (field: string) => string,
): SettingDefinition<string>[] {
  const textConfig = matchValueConfig(rule.matchType);
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

function matchValueConfig(matchType: MatchType): {
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

function profileOptions(settings: VeilSettings): Record<string, string> {
  const options: Record<string, string> = {
    "": "Inline wallpaper — use global appearance",
  };
  for (const profile of settings.profiles) {
    options[profile.id] = profile.name || profile.id;
  }
  return options;
}

function wallpaperRuleReady(
  app: App,
  settings: VeilSettings,
  rule: WallpaperRule,
): boolean {
  if (!contextRuleSyntaxValid(rule)) return false;
  const profile = rule.profileId
    ? settings.profiles.find((candidate) => candidate.id === rule.profileId)
    : undefined;
  const path = profile?.wallpaperPath || rule.wallpaperPath;
  if (!path) return false;
  const file = app.vault.getFileByPath(normalizePath(path));
  return Boolean(file && mediaKind(file));
}
