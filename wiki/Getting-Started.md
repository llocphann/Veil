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
2. In **Wallpaper**, either choose a vault image/GIF/video or enable **Wallpaper pool** and choose a **Wallpaper folder**.
3. Use **Appearance** for framing, opacity, and effects.
4. Use **Automation → Scenes** when you want reusable complete looks.
5. Use **Automation → Wallpaper routing** only when you want Veil to change automatically by note or system context.
6. Use **Data** for backup, import/export, and recovery.

Wallhaven is optional: open **Wallpaper → Wallpaper library → Wallhaven**, set filters, then press **Search**. Selected wallpapers are downloaded into the vault before Veil uses them.

## Settings tabs in Veil 1.7

| Tab | Use it for |
| --- | --- |
| **Wallpaper** | Wallpaper file or pool, pool folder/interval, playback & motion, and quick actions. |
| **Appearance** | Framing, zoom, opacity, vignette, blur, dim, overlay, and effect presets. |
| **Automation** | Scenes, Active context, wallpaper routing, and opacity exclusions. |
| **Data** | Export, import, restore defaults, and recovery. |

**About & support** is shared below the tabbed sections.

There is no separate **Behavior**, **Scenes**, or **Routing** tab in 1.7. Behavior controls are grouped into **Wallpaper → Playback & motion**; Scenes and Routing are grouped under **Automation**.

## Wallpaper pool quick setup

1. Turn on **Wallpaper pool**.
2. Choose **Wallpaper folder**.
3. Turn on **Include subfolders** if needed.
4. Set **Change interval** from 5 to 120 minutes.

Veil preserves the selected wallpaper file when a pool is enabled. That file is used again when the pool is disabled and can act as a fallback if a pool has no valid candidates.

## Command Palette

- **Veil: Reload wallpaper** — reload the current source.
- **Veil: Shuffle wallpaper pool** — choose another item from the active default/Scene pool.
- **Veil: Open wallpaper library** — open the visual browser.
- **Veil: Switch scene** — temporarily force a Scene or return to **Follow context rules**.

## Good first workflow

1. Finish one default wallpaper and appearance.
2. Add a Scene only when you need a different complete look.
3. Add Routing after the Scene works correctly.
4. Check **Automation → Active context** when a rule behaves unexpectedly.
5. Export a backup from **Data → Data & recovery** after building a larger setup.

Veil is event-driven. Relevant note, metadata, theme, layout, media, and pool events invalidate only the state that can change. Pool rotation uses scheduled boundaries rather than continuous polling.
