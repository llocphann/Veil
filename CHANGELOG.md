# Changelog

## Unreleased

- Add an optional SFW Wallhaven browser to Wallpaper Library that searches on demand, keeps pagination tied to the last explicit search, serializes full-resolution imports, validates downloaded JPEG/PNG data, saves the selected image into `Wallpapers/Wallhaven/`, and uses the local file afterward.
- Keep Wallpaper Library controls usable on narrower windows by allowing its toolbars to wrap.
- Avoid rebuilding wallpaper-pool candidate lists for unrelated vault changes, invalidate only pool scopes affected by changed media, and retain reusable folder scans across pool-setting changes.
- Reduce metadata-cache refresh work by skipping pre-layout events and checking active file paths without rebuilding full note contexts.
- Keep documentation regression checks aligned with the detailed routing guide after the README moved advanced usage into the Wiki.

## 1.4.0

- Add reusable **Scenes** that save wallpaper, framing, opacity, effects, transitions, and video behavior together.
- Let routing rules switch complete Scenes or keep the legacy inline-wallpaper behavior from 1.3.
- Add frontmatter property routing and adaptive `@theme`, `@time`, `@day`, and `@schedule` fallbacks, including overnight schedules.
- Add a session-only Scene switcher with **Follow context rules** to return to automatic routing.
- Add wallpaper pools for the default appearance and Scenes, with optional subfolders, stable selections, and manual shuffle.
- Add a visual Wallpaper Library with search, Favorites, Recently Selected, filters, sorting, target selection, and **Random visible**.
- Add horizontal and vertical focal points, 100–200% zoom, and configurable wallpaper crossfades.
- Keep the last working wallpaper visible during rapid navigation or when a configured source is temporarily unavailable.
- Improve multi-window and pop-out handling so each window resolves its own note and system context correctly.
- Add Settings organization with five task-focused tabs: **Wallpaper**, **Appearance**, **Behavior**, **Scenes**, and **Routing**, while keeping **Data & recovery** and **About & support** available below them.
- Preserve declarative Settings behavior behind a presentation adapter so Settings search and runtime semantics remain intact.
- Add duplicate-Scene support and make pool rename/delete behavior safer for selected media and ancestor folders.
- Tighten import validation, routing syntax warnings, release metadata checks, production bundle verification, and GitHub Actions release permissions.
