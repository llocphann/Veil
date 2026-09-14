# Getting Started

## Requirements

Veil is desktop-only and requires Obsidian 1.13.7 or newer. It works with media stored inside the current vault.

Supported image extensions: `avif`, `bmp`, `gif`, `jpeg`, `jpg`, `png`, `svg`, `webp`.

Supported video extensions: `mp4`, `webm`, `ogv`, `m4v`, `mov`.

A supported extension does not guarantee that every video codec will play. MP4 and WebM are the safest choices for broad compatibility with Obsidian's desktop runtime.

## First setup

Open **Settings → Community plugins → Veil**. In the **Wallpaper** tab, leave **Enable wallpaper** on and choose a file from the vault with **Wallpaper file**. Veil updates the workspace immediately.

If you prefer browsing visually, open **Wallpaper library** instead of selecting a file from the file picker.

## Settings layout

Veil has five main tabs:

| Tab | Purpose |
| --- | --- |
| **Wallpaper** | Enable Veil, choose media, open the Library, and configure a wallpaper pool. |
| **Appearance** | Framing, zoom, opacity, vignette, blur, dim, color overlay, and visual presets. |
| **Behavior** | Wallpaper transition, video/motion behavior, reload, and shuffle. |
| **Scenes** | Create reusable complete appearances. |
| **Routing** | Automatically select wallpapers or Scenes from note/system context and configure opacity exclusions. |

**Data & recovery** and **About & support** appear below the main tabs.

## Command Palette

Veil adds four commands:

- **Veil: Reload wallpaper** — force the current media to load again. Useful after a file change or a blocked video autoplay attempt.
- **Veil: Shuffle wallpaper pool** — select another item from the currently active default/Scene pool.
- **Veil: Open wallpaper library** — open the visual media browser.
- **Veil: Switch scene** — temporarily force one Scene, or choose **Follow context rules** to return to automatic routing.

## What happens when you navigate

Veil reacts to active-note changes, file opens, layout changes, relevant metadata changes, theme changes, and vault media changes. It does not continuously poll the vault.

When a new wallpaper is requested, Veil keeps the previous working wallpaper visible until the new media is ready. If the new file fails to load, the last working wallpaper remains instead of leaving a blank background.

## Main window and pop-out windows

Veil applies to the main Obsidian window and desktop pop-out windows. Each window resolves its own active note and system context, so two windows can display different routed Scenes at the same time.

## Vault-local paths only

Wallpaper paths are vault-relative. Veil rejects URLs, absolute paths, protocols such as `https:`, and paths that escape the vault with `..`.

When a selected wallpaper file or a folder used by a rule is renamed inside Obsidian, Veil updates its stored paths automatically. When media is deleted, matching Favorite/Recent entries are cleaned up.

## Recommended first workflow

1. Configure one default wallpaper and Appearance you like.
2. Add a Scene only when you want a second complete look with different opacity/effects/behavior.
3. Add Routing rules only after the Scene itself looks correct.
4. Check **Routing → Active context** whenever a rule seems not to behave as expected.

Continue with [Wallpaper, Library, and Pools](Wallpaper-Library-and-Pools.md) or [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md).
