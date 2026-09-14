# Veil Wiki

This wiki covers **Veil 1.7.0**. Veil is a desktop-only Obsidian plugin for vault-local image, GIF, and video wallpapers, reusable **Scenes**, context-aware **Routing**, wallpaper pools, visual effects, and an optional SFW Wallhaven browser.

## Start here

- [Getting Started](Getting-Started.md) — install, first setup, the 1.7 Settings layout, and commands.
- [Wallpaper, Library, and Pools](Wallpaper-Library-and-Pools.md) — vault media, Wallhaven, Favorites, Recent, explicit pool folders, and automatic pool rotation.
- [Appearance and Effects](Appearance-and-Effects.md) — framing, opacity, blur, dim, overlay, vignette, and effect presets.
- [Behavior and Video](Behavior-and-Video.md) — transition, playback, reduced motion, reload, and shuffle controls now grouped under **Wallpaper**.
- [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md) — reusable complete appearances, Scene pools, and temporary Scene switching.
- [Routing and Opacity Exclusions](Routing-and-Opacity-Exclusions.md) — note/system matching, priority, Active context, and opacity exceptions under **Automation**.
- [Data, Privacy, and Recovery](Data-Privacy-and-Recovery.md) — backup, import, restore, migration behavior, local data, and Wallhaven privacy.
- [Troubleshooting and Performance](Troubleshooting-and-Performance.md) — common problems and Veil 1.7 performance behavior.

## Settings layout in 1.7

| Tab | Main sections |
| --- | --- |
| **Wallpaper** | Wallpaper source or pool, **Playback & motion**, and **Quick actions**. |
| **Appearance** | **Framing & opacity** and **Effects**. |
| **Automation** | **Scenes**, **Active context**, **Wallpaper routing**, and **Opacity exclusions**. |
| **Data** | **Data & recovery**. |

**About & support** remains available below the tabbed sections.

## Core concepts

**Default appearance** — the global Wallpaper and Appearance configuration, including playback/motion behavior.

**Scene** — a reusable complete appearance: wallpaper or pool, pool folder/interval, framing, opacity, effects, transition, and video behavior.

**Inline wallpaper rule** — changes only the wallpaper file and keeps the global appearance. It does not use the global wallpaper pool.

**Active context** — the note plus system context Veil currently uses to resolve Routing. Inspect it under **Automation → Active context**.

## Wallpaper pools in 1.7

Pools no longer infer their scope from the selected wallpaper file. A pool has its own **Wallpaper folder**, optional **Include subfolders**, and **Change interval** from 5 to 120 minutes. The selected wallpaper file is preserved as the non-pool/fallback source.

Pools work for the default appearance and for Scenes. Inline wallpaper rules still do not own a pool.

## Routing priority

1. Temporary manual Scene override.
2. Note/path/folder/tag/frontmatter rules — first match wins.
3. `@theme`, `@time`, `@day`, and `@schedule` fallbacks — first match wins.
4. Default appearance.

Opacity exclusions are additive: every matching exclusion can contribute.

## Current limits

- 64 Scenes
- 96 wallpaper rules
- 96 opacity exclusions

For most users: configure the default look first, create Scenes second, then add Routing.

Version-specific changes are tracked in `CHANGELOG.md` and GitHub Releases; this wiki describes the current user-facing behavior.
