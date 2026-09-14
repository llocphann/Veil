# Getting Started

## Requirements

- Desktop Obsidian only.
- Obsidian **1.13.7+**.
- Wallpapers are stored inside the current vault.

Supported images: `avif`, `bmp`, `gif`, `jpeg`, `jpg`, `png`, `svg`, `webp`.

Supported videos: `mp4`, `webm`, `ogv`, `m4v`, `mov`.

A supported extension does not guarantee codec support. MP4 and WebM are the safest video choices.

## First setup

1. Open **Settings → Community plugins → Veil**.
2. In **Wallpaper**, choose a vault file or open **Wallpaper library**.
3. Use **Appearance** for framing, opacity, and effects.
4. Use **Scenes** for reusable complete looks.
5. Use **Routing** only when you want Veil to change automatically.

Wallhaven is optional: open **Wallpaper library → Wallhaven**, set filters, then press **Search**. Selected wallpapers are downloaded into the vault before Veil uses them.

## Settings tabs

| Tab | Use it for |
| --- | --- |
| **Wallpaper** | Media, Wallpaper Library, and pools. |
| **Appearance** | Framing, zoom, opacity, and effects. |
| **Behavior** | Transitions, video/motion behavior, reload, and shuffle. |
| **Scenes** | Reusable complete appearances. |
| **Routing** | Automatic wallpaper/Scene selection and opacity exclusions. |

**Data & recovery** and **About & support** are shared sections below the tabs.

## Command Palette

- **Veil: Reload wallpaper** — reload the current source.
- **Veil: Shuffle wallpaper pool** — choose another item from the active pool.
- **Veil: Open wallpaper library** — open the visual browser.
- **Veil: Switch scene** — temporarily force a Scene or return to **Follow context rules**.

## Good first workflow

1. Finish one default appearance.
2. Add a Scene only when you need a different complete look.
3. Add Routing after the Scene works correctly.
4. Check **Routing → Active context** when a rule behaves unexpectedly.

Veil is event-driven: it reacts to relevant note, metadata, theme, layout, and media changes instead of continuously polling the vault.
