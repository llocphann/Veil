# Appearance and Effects

The **Appearance** tab in Veil 1.7 contains **Framing & opacity** and **Effects**. Wallpaper transition and video/motion controls now live under **Wallpaper → Playback & motion**.

## Framing

| Setting | What it does |
| --- | --- |
| **Fill** | Fills the window and crops as needed. |
| **Fit** | Shows the whole wallpaper. |
| **Center** | Keeps original size and centers it. |
| **Stretch** | Fills the window without preserving proportions. |
| **Scale down** | Shrinks when needed but never enlarges. |

Use **Horizontal focal point** and **Vertical focal point** to choose which area stays in view when cropping. **Wallpaper zoom** ranges from 100–200%.

## Opacity

Veil has three separate opacity controls:

- **Wallpaper opacity** — only the wallpaper.
- **Pane background opacity** — pane surfaces while text/icons remain fully visible.
- **Pane & content opacity** — fades the whole pane group, including nested backgrounds, text, icons, and images.

For readability, lower **Pane background opacity** first. Use **Pane & content opacity** only when you intentionally want the entire pane group to fade.

Use **Automation → Opacity exclusions** to keep matching contexts fully opaque.

## Effects

- **Vignette** — elliptical or circular edge shading.
- **Blur** — wallpaper-only blur, 0–40 px.
- **Dim** — darkens the wallpaper without dimming Obsidian UI.
- **Color overlay** — tint with Color, Soft light, Overlay, Multiply, Screen, or Normal blend mode.
- **Effect preset** — None, Retro film, Glitch, or TV noise.

Each Scene stores its own framing, opacity, and effects. Changing the global Appearance does not rewrite existing Scenes.

## Live changes and media reuse

Appearance-only changes do not require Veil to replace unchanged media. Veil 1.7 coalesces rapid Settings changes and reuses the active image/video when its media identity has not changed, reducing unnecessary reloads and crossfades.

## Performance

Static opacity, dim, overlay, and vignette are comparatively light. Strong blur, video, animated GIFs, Glitch, and TV noise require more rendering work.

For the lightest setup: use a static image, little or no blur, and no animated preset.
