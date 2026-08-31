import {
  FuzzySuggestModal,
  PluginSettingTab,
  Setting,
} from "obsidian";
import type { App, SliderComponent, TFile, TextComponent } from "obsidian";
import type VeilPlugin from "./main";
import {
  DEFAULT_SETTINGS,
  DISPLAY_MODES,
  mediaKind,
  type DisplayMode,
  type VignetteMode,
} from "./settings";

type NumericSettingKey =
  | "opacity"
  | "paneOpacity"
  | "paneContentOpacity"
  | "vignetteIntensity"
  | "vignetteRadius"
  | "blurIntensity"
  | "dimIntensity";

class WallpaperFilePicker extends FuzzySuggestModal<TFile> {
  private readonly files: TFile[];
  private readonly onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.files = app.vault.getFiles().filter((file) => Boolean(mediaKind(file)));
    this.setPlaceholder("Choose an image, GIF, or video from this vault");
    this.emptyStateText = "No supported wallpaper files found in this vault.";
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

export class WallpaperSettingsTab extends PluginSettingTab {
  private readonly plugin: VeilPlugin;
  private statusEl: HTMLElement | null = null;

  constructor(app: App, plugin: VeilPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  updateStatus(): void {
    if (!this.statusEl?.isConnected) return;
    this.statusEl.textContent = this.plugin.status.message;
    this.statusEl.dataset.tone = this.plugin.status.tone;
  }

  private addNumberSetting(
    key: NumericSettingKey,
    name: string,
    description: string,
    maximum = 100,
    unit = "%",
    disabled = false,
  ): SliderComponent {
    const setting = new Setting(this.containerEl).setName(name).setDesc(description);
    let slider!: SliderComponent;
    setting.addSlider((control) => {
      slider = control;
      control
        .setLimits(0, maximum, 1)
        .setValue(this.plugin.settings[key])
        .setDisabled(disabled);
      control.sliderEl.setAttribute("aria-label", name);

      const output = setting.controlEl.createSpan();
      output.className = "vault-dashboard-setting-value";
      const showValue = (value: number): void => {
        output.textContent = `${value}${unit}`;
        control.sliderEl.setAttribute("aria-valuetext", `${value}${unit}`);
      };
      showValue(this.plugin.settings[key]);
      setting.controlEl.append(output);
      control.onChange((value) => {
        showValue(value);
        this.plugin.updateSettings({ [key]: value });
      });
    });
    return slider;
  }

  display(): void {
    const { containerEl, plugin } = this;
    containerEl.empty();
    containerEl.classList.add("vault-dashboard-background-settings");
    containerEl.createEl("p", {
      text: "Changes preview immediately. Wallpaper effects stay behind the interface. Use pane and content opacity to fade nested pane backgrounds and content too.",
      cls: "setting-item-description",
    });

    new Setting(containerEl)
      .setName("Enable wallpaper")
      .setDesc("Restore the theme's normal background when turned off.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.enabled)
          .onChange((enabled) => plugin.updateSettings({ enabled })),
      );

    let pathInput!: TextComponent;
    const fileSetting = new Setting(containerEl)
      .setName("Wallpaper file")
      .setDesc(
        "Use a full path inside this vault, or a full-path [[wikilink]]. Images, animated files, and videos are supported.",
      );
    fileSetting.settingEl.classList.add("vault-dashboard-path-setting");
    const applyPath = (): void => {
      plugin.updateSettings({ wallpaperPath: pathInput.getValue() });
      pathInput.setValue(plugin.settings.wallpaperPath);
    };
    fileSetting
      .addText((text) => {
        pathInput = text;
        text
          .setPlaceholder("Media/Wallpapers/example.webp")
          .setValue(plugin.settings.wallpaperPath);
        text.inputEl.setAttribute("aria-label", "Wallpaper file path");
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          applyPath();
        });
      })
      .addButton((button) => button.setButtonText("Apply").onClick(applyPath))
      .addButton((button) =>
        button.setButtonText("Choose file").onClick(() => {
          new WallpaperFilePicker(this.app, (file) => {
            pathInput.setValue(file.path);
            plugin.updateSettings({ wallpaperPath: file.path });
          }).open();
        }),
      );

    this.statusEl = containerEl.createDiv({
      cls: "vault-dashboard-wallpaper-status",
      attr: { role: "status", "aria-live": "polite" },
    });
    this.updateStatus();

    new Setting(containerEl)
      .setName("Display mode")
      .setDesc("The same sizing rules apply to every supported media type.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(DISPLAY_MODES)
          .setValue(plugin.settings.displayMode)
          .onChange((displayMode) =>
            plugin.updateSettings({ displayMode: displayMode as DisplayMode }),
          ),
      );

    this.addNumberSetting(
      "opacity",
      "Wallpaper opacity",
      "0% hides the wallpaper; 100% shows its full opacity.",
    );
    this.addNumberSetting(
      "paneOpacity",
      "Pane background opacity",
      "Lower values reveal more wallpaper without fading pane content.",
    );
    this.addNumberSetting(
      "paneContentOpacity",
      "Pane & content opacity",
      "Fade each pane as one group, including nested backgrounds, text, icons, and images. Settings and menus outside panes remain visible.",
    );

    new Setting(containerEl).setName("Effects").setHeading();
    new Setting(containerEl)
      .setName("Vignette mode")
      .setDesc("Shade the edges using the active theme's shadow palette.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({ off: "Off", ellipse: "Elliptical", circle: "Circular" })
          .setValue(plugin.settings.vignetteMode)
          .onChange((value) => {
            const vignetteMode = value as VignetteMode;
            plugin.updateSettings({ vignetteMode });
            vignetteIntensity.setDisabled(vignetteMode === "off");
            vignetteRadius.setDisabled(vignetteMode === "off");
          }),
      );
    const vignetteIntensity = this.addNumberSetting(
      "vignetteIntensity",
      "Vignette intensity",
      "Strength of the edge shading.",
      100,
      "%",
      plugin.settings.vignetteMode === "off",
    );
    const vignetteRadius = this.addNumberSetting(
      "vignetteRadius",
      "Vignette radius",
      "Clear center before shading begins. A larger radius leaves more of the center untouched.",
      100,
      "%",
      plugin.settings.vignetteMode === "off",
    );

    new Setting(containerEl)
      .setName("Blur")
      .setDesc("Blur the wallpaper only. High values use more GPU resources.")
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.blurEnabled).onChange((blurEnabled) => {
          plugin.updateSettings({ blurEnabled });
          blurIntensity.setDisabled(!blurEnabled);
        }),
      );
    const blurIntensity = this.addNumberSetting(
      "blurIntensity",
      "Blur intensity",
      "Blur radius in pixels.",
      40,
      " px",
      !plugin.settings.blurEnabled,
    );

    new Setting(containerEl)
      .setName("Dim")
      .setDesc("Reduce wallpaper brightness without dimming the interface.")
      .addToggle((toggle) =>
        toggle.setValue(plugin.settings.dimEnabled).onChange((dimEnabled) => {
          plugin.updateSettings({ dimEnabled });
          dimIntensity.setDisabled(!dimEnabled);
        }),
      );
    const dimIntensity = this.addNumberSetting(
      "dimIntensity",
      "Dim intensity",
      "0% keeps the original brightness; 100% darkens the wallpaper completely.",
      100,
      "%",
      !plugin.settings.dimEnabled,
    );

    new Setting(containerEl).setName("Video playback").setHeading();
    containerEl.createEl("p", {
      text: "Videos loop silently. For broad compatibility, use common web video formats. Other formats depend on codecs available in the local Obsidian installation. Animated images remain image elements.",
      cls: "setting-item-description",
    });
    new Setting(containerEl)
      .setName("Pause video when the app is hidden")
      .setDesc("Avoid decoding video when a window is not visible.")
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.pauseWhenHidden)
          .onChange((pauseWhenHidden) => plugin.updateSettings({ pauseWhenHidden })),
      );
    new Setting(containerEl)
      .setName("Respect reduced motion")
      .setDesc(
        "Pause video on a still frame when the operating system requests reduced motion. This setting cannot pause GIF files.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(plugin.settings.respectReducedMotion)
          .onChange((respectReducedMotion) => plugin.updateSettings({ respectReducedMotion })),
      );

    new Setting(containerEl)
      .setName("Reload wallpaper")
      .setDesc("Retry loading the current file or a video whose autoplay was blocked.")
      .addButton((button) =>
        button.setButtonText("Reload").onClick(() => plugin.refreshWallpaper(true)),
      );
    new Setting(containerEl)
      .setName("Restore defaults")
      .setDesc(
        "Clear the selected wallpaper, restore the default opacity values, and turn effects off. No media files are changed.",
      )
      .addButton((button) =>
        button.setButtonText("Restore").onClick(() => {
          plugin.updateSettings({ ...DEFAULT_SETTINGS });
          this.display();
        }),
      );
  }

  hide(): void {
    this.statusEl = null;
    void this.plugin.flushSettings();
  }
}
