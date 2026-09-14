# Appearance and Effects

The **Appearance** tab controls how the wallpaper is framed, how much of it is visible through the Obsidian interface, and which visual effects are applied.

## Display mode

| Mode | Behavior |
| --- | --- |
| **Fill** | Preserve proportions and crop as needed to fill the window. Best for normal wallpaper use. |
| **Fit** | Preserve proportions and show the entire wallpaper. Empty space may remain. |
| **Center** | Keep the media at its original size and center it. |
| **Stretch** | Fill the window without preserving proportions. The image can distort. |
| **Scale down** | Never enlarge the media; only shrink it when needed. |

The same sizing choices apply to images, GIFs, and videos.

## Focal point

**Horizontal focal point** moves the crop focus from left (`0%`) to right (`100%`). **Vertical focal point** moves it from top (`0%`) to bottom (`100%`). The default center is `50% / 50%`.

Focal point matters most with **Fill**, where some content may be cropped. For example, if a portrait is near the right side of a wide image, moving the horizontal focal point right keeps the subject visible when the window crops the image.

## Wallpaper zoom

**Wallpaper zoom** ranges from 100% to 200%. Zoom keeps the selected focal point anchored, so set the focal point first when you want to zoom toward a particular subject.

## The three opacity controls

These controls affect different layers and are intentionally separate.

### Wallpaper opacity

Controls only the wallpaper itself. `0%` hides the media; `100%` shows the media at full opacity.

### Pane background opacity

Controls pane surfaces while leaving their text, icons, and content at normal opacity. Lower values reveal more wallpaper behind editors, sidebars, and other panes without making the content itself faint.

This is usually the safest way to make the wallpaper more visible.

### Pane & content opacity

Fades each outer pane as one visual group, including nested backgrounds, text, icons, and images. Lower values therefore make the entire pane—including readable content—more transparent.

Use this only when you deliberately want the whole interface area to fade.

### Opacity exclusions

If certain notes should stay fully readable, use **Routing → Opacity exclusions**. An exclusion can independently keep pane backgrounds or whole pane content at 100% opacity for matching contexts. See [Routing and Opacity Exclusions](Routing-and-Opacity-Exclusions.md).

## Vignette

**Vignette mode** shades the wallpaper edges using the active theme's shadow palette.

- **Off** — no vignette.
- **Elliptical** — follows the window's wide aspect ratio naturally.
- **Circular** — uses a circular clear center.

**Vignette intensity** controls edge darkness. **Vignette radius** controls how large the clear center remains before shading starts.

## Blur

**Blur** affects only the wallpaper. **Blur intensity** ranges from 0 to 40 px.

High blur values cost more GPU time, especially with large wallpapers, high-resolution displays, multiple windows, or video.

## Dim

**Dim** reduces wallpaper brightness without darkening Obsidian's interface. Use **Dim intensity** to control the amount.

Dim is a low-cost way to improve text contrast without changing the source image.

## Color overlay

**Color overlay** places a configurable color layer over the wallpaper. Use **Overlay color** and **Overlay opacity** to control it.

The blend mode changes how the color interacts with the media:

| Blend mode | Typical result |
| --- | --- |
| **Color** | Recolors while preserving luminance; usually the most natural tint. |
| **Soft light** | Gentle tint and contrast adjustment. |
| **Overlay** | Stronger contrast tint. |
| **Multiply** | Darker tint. |
| **Screen** | Lighter tint. |
| **Normal** | Flat color layer over the media. |

## Effect preset

Veil applies one optimized preset at a time:

- **None** — no preset.
- **Retro film** — sepia/saturation/contrast treatment with a film-style layer.
- **Glitch** — animated glitch treatment.
- **TV noise** — animated noise treatment.

**Effect intensity** controls both visual strength and, for animated presets, update speed.

## Effect cost

Vignette, dim, and ordinary color overlays are comparatively light. Retro film is low to moderate. Strong blur can be GPU-heavy. Glitch and TV noise animate continuously and are more expensive.

For the lightest setup, use a static image, little or no blur, and no animated effect preset. See [Troubleshooting and Performance](Troubleshooting-and-Performance.md) for more guidance.

## Scene-specific appearance

Every Scene has its own copy of these appearance controls. Changing the global/default Appearance does not automatically rewrite existing Scenes. Use **Copy current global appearance** inside a Scene when you intentionally want to replace that Scene's current appearance with the global one.
