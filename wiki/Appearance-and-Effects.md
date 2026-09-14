# Appearance and Effects

The **Appearance** tab controls framing, visibility, and visual effects.

## Framing

| Setting | What it does |
| --- | --- |
| **Fill** | Fills the window and crops as needed. |
| **Fit** | Shows the whole wallpaper. |
| **Center** | Keeps original size and centers it. |
| **Stretch** | Fills the window without preserving proportions. |
| **Scale down** | Shrinks when needed but never enlarges. |

Use **Horizontal/Vertical focal point** to choose what part of the wallpaper stays in view when cropping. **Wallpaper zoom** ranges from 100–200%.

## Opacity

Veil has three separate opacity controls:

- **Wallpaper opacity** — only the wallpaper.
- **Pane background opacity** — pane surfaces, while text/icons stay fully visible.
- **Pane & content opacity** — fades the whole pane group, including text and icons.

For readability, lower **Pane background opacity** first. Use **Pane & content opacity** only when you intentionally want the whole interface to fade.

Use **Routing → Opacity exclusions** to keep matching contexts fully opaque.

## Effects

- **Vignette** — elliptical or circular edge shading.
- **Blur** — wallpaper-only blur, 0–40 px.
- **Dim** — darkens the wallpaper without dimming Obsidian UI.
- **Color overlay** — tint with Color, Soft light, Overlay, Multiply, Screen, or Normal blend mode.
- **Effect preset** — None, Retro film, Glitch, or TV noise.

## Performance

Static effects are light. Strong blur, video, Glitch, and TV noise cost more GPU time.

For the lightest setup: use a static image, little/no blur, and no animated preset.

Each Scene stores its own Appearance values. Changing the global Appearance does not rewrite existing Scenes.
