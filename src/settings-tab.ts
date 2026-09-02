import { setIcon, type SettingDefinitionItem } from "obsidian";
import { WallpaperSettingsTab as BaseWallpaperSettingsTab } from "./settings-tab-base";

const SETTINGS_SECTIONS = [
  { id: "wallpaper", label: "Wallpaper", icon: "image" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "behavior", label: "Behavior", icon: "timer" },
  { id: "scenes", label: "Scenes", icon: "layers-3" },
  { id: "routing", label: "Routing", icon: "list-filter" },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

type MutableDefinition = SettingDefinitionItem<string> & {
  cls?: string;
  heading?: string;
  items?: SettingDefinitionItem<string>[];
  name?: string;
};

const APPEARANCE_ITEM_NAMES = new Set([
  "Display mode",
  "Horizontal focal point",
  "Vertical focal point",
  "Wallpaper zoom",
  "Wallpaper opacity",
  "Pane background opacity",
  "Pane & content opacity",
]);

const BEHAVIOR_ITEM_NAMES = new Set(["Wallpaper transition"]);
const QUICK_ACTION_NAMES = new Set(["Reload wallpaper", "Shuffle wallpaper pool"]);
const DATA_ACTION_NAMES = new Set(["Export settings", "Import settings", "Restore defaults"]);

function mutable(definition: SettingDefinitionItem<string>): MutableDefinition {
  return definition;
}

function itemName(item: SettingDefinitionItem<string>): string {
  return mutable(item).name || "";
}

function itemsOf(definition: SettingDefinitionItem<string> | undefined): SettingDefinitionItem<string>[] {
  return definition ? [...(mutable(definition).items || [])] : [];
}

function cloneDefinition(
  definition: SettingDefinitionItem<string> | undefined,
  heading: string,
  cls: string,
  items?: SettingDefinitionItem<string>[],
): SettingDefinitionItem<string> | null {
  if (!definition) return null;
  const next: MutableDefinition = {
    ...mutable(definition),
    heading,
    cls,
  };
  if (items) next.items = items;
  return next;
}

function compact(
  definitions: Array<SettingDefinitionItem<string> | null | undefined>,
): SettingDefinitionItem<string>[] {
  return definitions.filter((definition): definition is SettingDefinitionItem<string> =>
    Boolean(definition));
}

/**
 * Presentation adapter for Veil settings.
 *
 * The underlying settings implementation remains in settings-tab-base.ts so
 * routing, validation, import/export, and Scene behavior stay unchanged. The
 * tab bar exposes only the primary feature sections; portable data controls
 * and about/support are rendered as shared sections beneath every tab.
 */
export class WallpaperSettingsTab extends BaseWallpaperSettingsTab {
  private activeSection: SettingsSectionId = "wallpaper";

  override getSettingDefinitions(): SettingDefinitionItem<string>[] {
    const base = super.getSettingDefinitions();
    const find = (predicate: (definition: MutableDefinition) => boolean) =>
      base.find((definition) => predicate(mutable(definition)));

    const wallpaper = find((definition) => definition.cls === "veil-settings-panel-wallpaper");
    const scenes = find((definition) => definition.heading === "Scenes");
    const activeContext = find((definition) => definition.heading === "Active context");
    const wallpaperRouting = find((definition) => definition.heading === "Wallpaper routing");
    const opacityExclusions = find((definition) => definition.heading === "Opacity exclusions");
    const effects = find((definition) => definition.cls === "veil-settings-panel-effects");
    const video = find((definition) => definition.cls === "veil-settings-panel-video");
    const actions = find((definition) => definition.cls === "veil-settings-panel-actions");
    const support = find((definition) => definition.cls === "veil-settings-panel-support");

    const wallpaperItems = itemsOf(wallpaper);
    const sourceItems = wallpaperItems.filter((item) =>
      !APPEARANCE_ITEM_NAMES.has(itemName(item)) && !BEHAVIOR_ITEM_NAMES.has(itemName(item)));
    const appearanceItems = wallpaperItems.filter((item) =>
      APPEARANCE_ITEM_NAMES.has(itemName(item)));
    const transitionItems = wallpaperItems.filter((item) =>
      BEHAVIOR_ITEM_NAMES.has(itemName(item)));

    const actionItems = itemsOf(actions);
    const quickActions = actionItems.filter((item) => QUICK_ACTION_NAMES.has(itemName(item)));
    const dataActions = actionItems.filter((item) => DATA_ACTION_NAMES.has(itemName(item)));

    const tabPanels = compact([
      cloneDefinition(wallpaper, "Wallpaper", "veil-settings-panel-wallpaper", sourceItems),
      cloneDefinition(
        video,
        "Playback & motion",
        "veil-settings-panel-behavior",
        [...transitionItems, ...itemsOf(video)],
      ),
      cloneDefinition(actions, "Quick actions", "veil-settings-panel-behavior", quickActions),
      cloneDefinition(activeContext, "Active context", "veil-settings-panel-routing"),
      cloneDefinition(wallpaperRouting, "Wallpaper routing", "veil-settings-panel-routing"),
      cloneDefinition(opacityExclusions, "Opacity exclusions", "veil-settings-panel-routing"),
      cloneDefinition(
        wallpaper,
        "Framing & opacity",
        "veil-settings-panel-appearance",
        appearanceItems,
      ),
      cloneDefinition(effects, "Effects", "veil-settings-panel-appearance"),
      cloneDefinition(scenes, "Scenes", "veil-settings-panel-scenes"),
    ]);

    const sharedSections = compact([
      cloneDefinition(actions, "Data & recovery", "veil-settings-section-data", dataActions),
      cloneDefinition(support, "About & support", "veil-settings-section-about"),
    ]);

    return [this.navigationDefinition(), ...tabPanels, ...sharedSections];
  }

  private navigationDefinition(): SettingDefinitionItem<string> {
    return {
      type: "group",
      cls: "veil-settings-tabs-group",
      items: [{
        name: "Settings sections",
        searchable: false,
        render: (setting) => {
          this.containerEl.classList.add("veil-settings-root");
          this.containerEl.dataset.veilSettingsTab = this.activeSection;
          setting.settingEl.classList.add("veil-settings-tabs-setting");
          setting.controlEl.setCssStyles({
            width: "100%",
            justifyContent: "flex-start",
          });

          const tabList = setting.controlEl.createDiv({ cls: "veil-settings-tabs" });
          tabList.setAttribute("role", "tablist");
          tabList.setAttribute("aria-label", "Veil settings sections");
          const buttons: HTMLButtonElement[] = [];
          const cleanups: Array<() => void> = [];

          const syncPanels = (): void => {
            for (const section of SETTINGS_SECTIONS) {
              const selected = section.id === this.activeSection;
              const panels = this.containerEl.querySelectorAll(
                `.veil-settings-panel-${section.id}`,
              );
              for (const panel of Array.from(panels)) {
                if (panel.instanceOf(HTMLElement)) panel.hidden = !selected;
              }
            }
          };

          const activate = (sectionId: SettingsSectionId, focus = false): void => {
            this.activeSection = sectionId;
            this.containerEl.dataset.veilSettingsTab = sectionId;
            for (const candidate of buttons) {
              const selected = candidate.dataset.tabId === sectionId;
              candidate.setAttribute("aria-selected", String(selected));
              candidate.tabIndex = selected ? 0 : -1;
              if (selected && focus) candidate.focus();
            }
            syncPanels();
          };

          for (const section of SETTINGS_SECTIONS) {
            const button = tabList.createEl("button", {
              cls: "veil-settings-tab",
              attr: {
                type: "button",
                role: "tab",
                "data-tab-id": section.id,
                "aria-selected": "false",
              },
            });
            const icon = button.createSpan({ cls: "veil-settings-tab-icon" });
            setIcon(icon, section.icon);
            button.createSpan({ text: section.label });
            const onClick = (): void => activate(section.id);
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
            const next = SETTINGS_SECTIONS[nextIndex];
            if (!next) return;
            event.preventDefault();
            activate(next.id, true);
          };
          tabList.addEventListener("keydown", onKeyDown);
          cleanups.push(() => tabList.removeEventListener("keydown", onKeyDown));

          activate(this.activeSection);
          const view = this.containerEl.ownerDocument.defaultView;
          const frame = view?.requestAnimationFrame(() => syncPanels()) ?? null;
          return () => {
            if (frame !== null) view?.cancelAnimationFrame(frame);
            cleanups.forEach((cleanup) => cleanup());
          };
        },
      }],
    };
  }
}
