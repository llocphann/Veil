import type { SettingDefinition, SettingDefinitionItem } from "obsidian";
import {
  COLOR_OVERLAY_BLEND_MODES,
  DISPLAY_MODES,
  EFFECT_PRESETS,
  type VeilProfile,
  type VeilSettings,
} from "./settings";

export type SliderFactory = (
  key: string,
  name: string,
  desc: string,
  maximum?: number,
  unit?: string,
  disabled?: () => boolean,
) => SettingDefinition<string>;

export type RangeSliderFactory = (
  key: string,
  name: string,
  desc: string,
  minimum: number,
  maximum: number,
  step: number,
  unit: string,
  disabled?: () => boolean,
) => SettingDefinition<string>;

export function createSceneAppearanceDefinitions(
  profile: VeilProfile,
  key: (field: string) => string,
  slider: SliderFactory,
  rangeSlider: RangeSliderFactory,
): SettingDefinition<string>[] {
  return [
    {
      name: "Display mode",
      control: { type: "dropdown", key: key("displayMode"), options: DISPLAY_MODES },
    },
    slider(
      key("wallpaperPositionX"),
      "Horizontal focal point",
      "Scene-specific horizontal crop focus.",
    ),
    slider(
      key("wallpaperPositionY"),
      "Vertical focal point",
      "Scene-specific vertical crop focus.",
    ),
    rangeSlider(
      key("wallpaperZoom"),
      "Wallpaper zoom",
      "Scene-specific wallpaper zoom.",
      100,
      200,
      1,
      "%",
    ),
    rangeSlider(
      key("transitionDuration"),
      "Wallpaper transition",
      "Scene-specific crossfade duration, including pool shuffles.",
      0,
      2000,
      20,
      " ms",
    ),
    slider(key("opacity"), "Wallpaper opacity", "Scene-specific wallpaper opacity."),
    slider(
      key("paneOpacity"),
      "Pane background opacity",
      "Scene-specific pane surface opacity.",
    ),
    slider(
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
    slider(
      key("vignetteIntensity"),
      "Vignette intensity",
      "Scene-specific edge shading strength.",
      100,
      "%",
      () => profile.vignetteMode === "off",
    ),
    slider(
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
    slider(
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
    slider(
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
      ...slider(
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
    slider(
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

export function createEffectsDefinitions(
  settings: VeilSettings,
  slider: SliderFactory,
): SettingDefinitionItem<string> {
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
      slider(
        "vignetteIntensity",
        "Vignette intensity",
        "Strength of the edge shading.",
        100,
        "%",
        () => settings.vignetteMode === "off",
      ),
      slider(
        "vignetteRadius",
        "Vignette radius",
        "Clear center before shading begins.",
        100,
        "%",
        () => settings.vignetteMode === "off",
      ),
      {
        name: "Blur",
        desc: "Blur the wallpaper only. High values use more GPU resources.",
        control: { type: "toggle", key: "blurEnabled" },
      },
      slider(
        "blurIntensity",
        "Blur intensity",
        "Blur radius in pixels.",
        40,
        " px",
        () => !settings.blurEnabled,
      ),
      {
        name: "Dim",
        desc: "Reduce wallpaper brightness without dimming the interface.",
        control: { type: "toggle", key: "dimEnabled" },
      },
      slider(
        "dimIntensity",
        "Dim intensity",
        "0% keeps original brightness; 100% darkens completely.",
        100,
        "%",
        () => !settings.dimEnabled,
      ),
      {
        name: "Color overlay",
        desc: "Place a color layer over the wallpaper.",
        control: { type: "toggle", key: "colorOverlayEnabled" },
      },
      {
        name: "Overlay color",
        control: { type: "color", key: "colorOverlayColor" },
        visible: () => settings.colorOverlayEnabled,
      },
      {
        ...slider(
          "colorOverlayOpacity",
          "Overlay opacity",
          "Strength of the selected color layer.",
          100,
          "%",
          () => !settings.colorOverlayEnabled,
        ),
        visible: () => settings.colorOverlayEnabled,
      },
      {
        name: "Overlay blend mode",
        desc: "Color preserves image detail most closely; other modes alter brightness and contrast.",
        control: {
          type: "dropdown",
          key: "colorOverlayBlendMode",
          options: COLOR_OVERLAY_BLEND_MODES,
        },
        visible: () => settings.colorOverlayEnabled,
      },
      {
        name: "Effect preset",
        desc: "Apply one optimized preset at a time.",
        control: { type: "dropdown", key: "effectPreset", options: EFFECT_PRESETS },
      },
      slider(
        "effectIntensity",
        "Effect intensity",
        "Strength and animated update speed.",
        100,
        "%",
        () => settings.effectPreset === "none",
      ),
      {
        name: "Performance guide",
        desc: "Overlay, dim, and vignette are low cost. Retro is low to moderate. Blur is GPU-heavy at high radius. Glitch and TV noise animate continuously.",
        searchable: false,
      },
    ],
  };
}

export function createVideoDefinitions(): SettingDefinitionItem<string> {
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
