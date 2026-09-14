# Veil Wiki

This wiki documents the user-facing features in Veil 1.4.

Veil is a desktop-only Obsidian plugin for vault-local image, GIF, and video wallpapers. The basic wallpaper controls are simple; the sections below spend more time on the features that are easiest to misunderstand: Scenes, Routing, system-context rules, wallpaper pools, pane opacity, and the Wallpaper Library.

## Start here

- [Getting Started](Getting-Started.md) — first setup, supported media, settings layout, and commands.
- [Wallpaper, Library, and Pools](Wallpaper-Library-and-Pools.md) — choosing media, stable random pools, Favorites, Recent, filters, and Random visible.
- [Appearance and Effects](Appearance-and-Effects.md) — display modes, focal point, zoom, the three opacity controls, vignette, blur, dim, overlay, and presets.
- [Behavior and Video](Behavior-and-Video.md) — transitions, video playback, reduced motion, reload, and shuffle behavior.
- [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md) — complete reusable appearances and temporary scene switching.
- [Routing and Opacity Exclusions](Routing-and-Opacity-Exclusions.md) — matching notes and metadata, rule priority, `@theme`, `@time`, `@day`, `@schedule`, and opacity exceptions.
- [Data, Privacy, and Recovery](Data-Privacy-and-Recovery.md) — export/import, restore defaults, local data, and privacy boundaries.
- [Troubleshooting and Performance](Troubleshooting-and-Performance.md) — common failures, video codec issues, and performance guidance.

## The four concepts to understand

### Default appearance

The settings in **Wallpaper**, **Appearance**, and **Behavior** form Veil's default appearance. It is used whenever no wallpaper routing rule or manual Scene override takes control.

### Scene

A Scene stores a complete appearance: wallpaper, pool configuration, framing, opacity, effects, transition, and video behavior. A routing rule can switch to a Scene instead of changing only one wallpaper file.

### Inline wallpaper rule

An inline rule changes only the wallpaper media. It continues using the global/default framing, opacity, effects, transition, and video settings. It intentionally does **not** inherit the global wallpaper pool.

### Active context

Veil resolves each Obsidian window from its active note plus system context such as theme and local time. In **Routing → Active context**, Veil shows which default appearance, rule, Scene, or manual override currently won.

## Resolution order

When choosing a wallpaper appearance, Veil uses this priority:

1. Temporary manual Scene override.
2. Ordinary note/path/folder/tag/frontmatter wallpaper rules, first match in list order.
3. Adaptive `@theme`, `@time`, `@day`, and `@schedule` wallpaper fallbacks, first match in list order.
4. Default appearance.

Opacity exclusions are different: every matching exclusion contributes independently, so multiple exclusions can apply at the same time.

## Limits

Veil accepts up to 64 Scenes, 96 wallpaper routing rules, and 96 opacity exclusion rules. Imported settings use the same limits.

## Related pages

For the two most important advanced topics, read [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md) and [Routing and Opacity Exclusions](Routing-and-Opacity-Exclusions.md) together.
