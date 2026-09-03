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
