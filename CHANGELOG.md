# Changelog

## Unreleased

## 1.5.1

- Fix the Wallpaper Library toolbar spacing CSS to avoid Obsidian Community CSS lint reporting partial `multicolumn` support.

## 1.5.0

- Add an optional SFW Wallhaven browser to Wallpaper Library with explicit search, category, minimum-resolution, ratio, and sorting controls.
- Keep Wallhaven pagination tied to the last explicit search, deduplicate appended results, and import only the wallpaper the user selects.
- Validate Wallhaven hosts, HTTP status, declared MIME type, and JPEG/PNG file signatures before saving originals into `Wallpapers/Wallhaven/`; Veil then uses the local vault copy for playback.
- Serialize full-resolution Wallhaven imports, reuse deterministic files that are already present, and prevent slower stale downloads from overriding a newer wallpaper selection.
- Redesign Wallpaper Library around pagination with 20 wallpapers per page, a five-column desktop grid, larger previews, optional metadata, and current-page Random visible behavior.
- Regroup Wallpaper Library filters and secondary actions, use content-sized selectors, keep search on its own row, improve responsive wrapping, and remain compatible with Obsidian Community CSS lint rules.
- Keep the Wallpaper Library modal visually within the Veil settings content lane on desktop instead of overlapping the Settings/plugin sidebar.
- Scope wallpaper-pool cache invalidation to media changes that affect the relevant pool folders, retain reusable folder scans across pool-setting updates, and reduce metadata-cache hot-path work.
- Split detailed usage guidance into README/Wiki documentation and keep routing/privacy documentation regression checks aligned with the new structure.
- Expand regression coverage for Wallhaven search/import hardening, stale-completion protection, pool cache invalidation, runtime hot paths, Wallpaper Library pagination/layout, and Community CSS compatibility.

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
- Add **Duplicate scene** for copying a complete Scene to a new independent Scene.
- Add circular and elliptical vignette shapes, color overlays with blend modes, and Retro, Glitch, and TV Noise effects.
- Improve the Settings experience with a task-oriented five-tab layout: **Wallpaper → Appearance → Behavior → Scenes → Routing**. Data/recovery and About/support remain shared sections below the selected tab.
- Keep Settings descriptions short and make the tab strip frameless and centered.
- Fix Wallpaper Library thumbnail sizing so themes cannot collapse previews to button height.
- Add configurable video autoplay, loop, muted playback, hidden-window pausing, and reduced-motion handling.
- Keep wallpaper media inside the vault and preserve desktop pop-out support.

## 1.3.0

- Add note-aware wallpaper routing by note name, path, folder, and tag.
- Add additive pane-opacity exclusions by note name, path, folder, and tag.
- Add a live active-context inspector and drag-and-drop ordering for routing and exclusion rules.
- Add export, import, and restore-default actions in Settings.
- Add Reload wallpaper to the Command Palette and Settings.
- Refresh routed wallpaper state when metadata changes.
- Harden route and exclusion rules with dedicated limits, missing-match status warnings, and visible delete controls.
- Normalize imported routing collections without changing their configured order.
- Document routing and opacity-exclusion behavior in the README.
- Harden local wallpaper paths against traversal-like, absolute, and URL-shaped values.

## 1.2.0

- Add JPEG XL (`.jxl`) image support.
- Add animated PNG (`.apng`) image support.
- Add support for the PNG/JPEG/WebP formats that Obsidian currently accepts in image embeds.

## 1.1.1

- Ensure pane surfaces, nested workspaces, and note content follow the configured opacity more consistently.
- Keep sidebar title bars, split handles, and status surfaces visually aligned with pane transparency.

## 1.1.0

- Add a separate pane content opacity control.
- Allow the whole pane group, including visible text and content, to fade independently from pane surface opacity.

## 1.0.0

- Initial public release.
- Add vault-local image, animated GIF, and video wallpapers.
- Add fill, fit, center, stretch, and scale-down display modes.
- Add wallpaper and pane opacity controls.
- Add optional nested pane fading.
- Add circular and elliptical vignette effects.
- Add blur and dim controls.
- Add desktop pop-out window support.
- Pause video playback in hidden windows when enabled.
- Respect reduced-motion preferences.
