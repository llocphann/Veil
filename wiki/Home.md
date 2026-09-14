# Veil Wiki

This wiki covers **Veil 1.5.1**. Veil is a desktop-only Obsidian plugin for vault-local image, GIF, and video wallpapers, reusable **Scenes**, context-aware **Routing**, wallpaper pools, effects, and an optional SFW Wallhaven browser.

## Start here

- [Getting Started](Getting-Started.md) — install, first setup, tabs, and commands.
- [Wallpaper, Library, and Pools](Wallpaper-Library-and-Pools.md) — vault media, Wallhaven, Favorites, Recent, pagination, and pools.
- [Appearance and Effects](Appearance-and-Effects.md) — framing, opacity, blur, dim, overlay, vignette, and presets.
- [Behavior and Video](Behavior-and-Video.md) — transitions, video playback, reduced motion, reload, and shuffle.
- [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md) — reusable complete appearances and temporary Scene switching.
- [Routing and Opacity Exclusions](Routing-and-Opacity-Exclusions.md) — note/system matching, priority, and opacity exceptions.
- [Data, Privacy, and Recovery](Data-Privacy-and-Recovery.md) — backup, import, restore, local data, and Wallhaven privacy.
- [Troubleshooting and Performance](Troubleshooting-and-Performance.md) — common problems and performance tips.

## Core concepts

**Default appearance** — the global Wallpaper, Appearance, and Behavior settings.

**Scene** — a reusable complete appearance: wallpaper/pool, framing, opacity, effects, transition, and video behavior.

**Inline wallpaper rule** — changes only the wallpaper file and keeps the global appearance. It does not use the global wallpaper pool.

**Active context** — the note plus system context Veil currently uses for Routing.

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
