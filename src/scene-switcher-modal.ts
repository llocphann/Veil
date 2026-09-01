import { SuggestModal, type App } from "obsidian";
import type { VeilProfile } from "./settings";

interface SceneChoice {
  id: string;
  name: string;
  detail: string;
}

interface SceneSwitcherController {
  getProfiles: () => VeilProfile[];
  getActiveOverrideId: () => string;
  choose: (profileId: string) => void;
}

export class SceneSwitcherModal extends SuggestModal<SceneChoice> {
  private readonly controller: SceneSwitcherController;

  constructor(app: App, controller: SceneSwitcherController) {
    super(app);
    this.controller = controller;
    this.setPlaceholder("Switch Veil scene…");
  }

  getSuggestions(query: string): SceneChoice[] {
    const normalized = query.trim().toLowerCase();
    const activeOverrideId = this.controller.getActiveOverrideId();
    const choices: SceneChoice[] = [
      {
        id: "",
        name: "Follow context rules",
        detail: activeOverrideId ? "Clear the manual scene override" : "Currently active",
      },
      ...this.controller.getProfiles().map((profile) => ({
        id: profile.id,
        name: profile.name || profile.id,
        detail: profile.id === activeOverrideId
          ? "Manual override currently active"
          : profile.wallpaperPoolEnabled
            ? "Scene · wallpaper pool"
            : "Scene",
      })),
    ];
    if (!normalized) return choices;
    return choices.filter((choice) =>
      `${choice.name} ${choice.detail}`.toLowerCase().includes(normalized));
  }

  renderSuggestion(choice: SceneChoice, el: HTMLElement): void {
    const row = el.createDiv({ cls: "veil-scene-switcher-row" });
    row.createDiv({ cls: "veil-scene-switcher-name", text: choice.name });
    row.createDiv({ cls: "veil-scene-switcher-detail", text: choice.detail });
  }

  onChooseSuggestion(choice: SceneChoice): void {
    this.controller.choose(choice.id);
  }
}
