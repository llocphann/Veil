# Changelog

## Unreleased

## 1.7.0

### Highlights

- Make Veil noticeably lighter during everyday use by coalescing rapid Settings slider changes, caching document context, Scene/Automation resolution, and wallpaper source lookups, and replacing repeated workspace leaf scans with a live document registry.
- Redesign Wallpaper Pool configuration around an explicit **Wallpaper folder**, optional **Include subfolders**, and automatic **Change interval** rotation while preserving the previously selected wallpaper file and Wallpaper Library state when the pool is enabled.
- Keep old pool configurations compatible by deriving the new folder from the existing wallpaper path when needed, including Scene pools, without discarding legacy data.
- Simplify Settings into four primary tabs: **Wallpaper**, **Appearance**, **Automation**, and **Data**. Behavior is folded into Wallpaper; Scenes and Routing are grouped under Automation; Data & recovery gets its own dedicated tab.
- Preserve existing Scenes, Routing rules, opacity exclusions, Wallpaper Library data, import/export data, and persisted settings while reorganizing the UI.
- Improve pool rotation efficiency with one-shot scheduling so idle Veil does not poll continuously and only documents using a due pool context are refreshed.
- Extend development profiling with context-build, Scene-resolution, and source-lookup counters and make `npm run perf` compare directly against the released 1.6.0 baseline.
- Retain the full 1.6 stability contract: unchanged media is reused, unrelated events stay scoped, idle work remains minimal, and persisted migrations remain deterministic.

## 1.6.0

### Highlights

- Rework Veil into smaller ownership-focused runtime and Settings modules so context, layout, metadata, theme, pool, vault, and Settings changes invalidate only the documents or caches that can actually change.
- Separate media identity from appearance and playback state so unchanged images and videos are reused instead of being reloaded, reallocated, or crossfaded unnecessarily.
- Add deterministic persisted-data schema migrations and regression coverage for safe upgrades.
- Reduce Settings and Wallpaper Library DOM work with local refreshes and card-level patches instead of broad rerenders.
- Add development-only runtime work profiling and stability gates for no-op refreshes, media reuse, scoped invalidation, vault cache churn, idle work, and migration behavior.
- Harden idle behavior by pausing hidden animated effects, avoiding unnecessary recurring work, and retaining routing timers only for meaningful time boundaries.

## 1.5.3

### Highlights

- Make `prerelease` the mandatory smoke-test gate before stable promotion and require the stable source tree to match the smoke-tested prerelease candidate exactly.
- Move stable publishing into a self-contained promotion workflow that verifies source provenance and the production build before creating release artifacts.
- Add workflow regression tests for the `dev → prerelease → stable` release path and keep the public release branch tied to verified source.

## 1.5.2

### Highlights

- Harden release automation with CI coverage for development and stable branches, automated semantic versioning/tagging, and explicit separation between verification and release-write permissions.
- Retain failed verification logs as short-lived artifacts to make release failures easier to diagnose.
- Refresh project documentation and Wiki coverage, including routing documentation regression anchors and repository-hosted support assets.

## 1.5.1

### Highlights

- Fix Wallpaper Library toolbar spacing so Obsidian Community CSS lint no longer reports partial `multicolumn` support.
- Preserve the same visual layout by replacing separate row/column gap declarations with the equivalent `gap` shorthand.

## 1.5.0

### Highlights

- Add an optional SFW Wallhaven browser inside Wallpaper Library with explicit search, category, minimum-resolution, ratio, sorting, and pagination controls.
- Validate Wallhaven hosts, responses, MIME types, and JPEG/PNG signatures before importing selected originals into `Wallpapers/Wallhaven/`, after which Veil uses the local vault copy.
- Redesign Wallpaper Library around a paginated 20-item desktop view, larger previews, a five-column grid, responsive controls, Favorites/Recent workflows, and current-page **Random visible** behavior.
- Prevent stale or slower Wallhaven downloads from overriding a newer selection and reuse deterministic local files when possible.
- Tighten wallpaper-pool cache invalidation so only media changes affecting relevant folders invalidate candidate scans.
- Expand regression coverage for Wallhaven hardening, pool caching, runtime hot paths, Wallpaper Library layout, and Community CSS compatibility.

## 1.4.0

### Highlights

- Add reusable **Scenes** that save wallpaper, framing, opacity, effects, transitions, and video behavior together.
- Expand Routing with frontmatter-property matching and adaptive `@theme`, `@time`, `@day`, and `@schedule` system contexts, including overnight schedules.
- Add session-only Scene switching with **Follow context rules** to return to automatic routing.
- Add wallpaper pools for the default appearance and Scenes, optional subfolders, stable selections, and manual shuffle.
- Add the visual Wallpaper Library with search, Favorites, Recently Selected, filters, sorting, target selection, and **Random visible**.
- Add focal-point controls, 100–200% zoom, configurable crossfades, circular/elliptical vignette shapes, color overlays, and Retro/Glitch/TV Noise effects.
- Improve multi-window and pop-out handling, video playback controls, reduced-motion behavior, and fallback handling when a configured source is temporarily unavailable.
- Introduce a task-oriented Settings layout while keeping data/recovery and support workflows accessible.

## 1.3.0

### Highlights

- Add note-aware wallpaper routing by note name, exact path, folder, and tag.
- Add additive pane-opacity exclusions using the same note-context matching model.
- Add a live active-context inspector and drag-and-drop ordering for routing and exclusion rules.
- Add Settings export/import, restore defaults, and Reload wallpaper actions.
- Refresh routed state on metadata changes and harden rule limits, validation warnings, delete controls, imported collection ordering, and local wallpaper path handling.

## 1.2.0

### Highlights

- Expand image support with JPEG XL (`.jxl`) and animated PNG (`.apng`).
- Align PNG, JPEG, and WebP support with formats accepted by current Obsidian image embeds.

## 1.1.1

### Highlights

- Make pane surfaces, nested workspaces, and note content follow configured opacity more consistently.
- Keep sidebar title bars, split handles, and status surfaces visually aligned with pane transparency.

## 1.1.0

### Highlights

- Add a separate pane-content opacity control.
- Allow the entire pane group, including visible text and content, to fade independently from pane-surface opacity.

## 1.0.0

### Highlights

- Initial public release of Veil.
- Add vault-local image, animated GIF, and video wallpapers with fill, fit, center, stretch, and scale-down display modes.
- Add wallpaper opacity, pane opacity, optional nested-pane fading, vignette, blur, and dim controls.
- Support desktop pop-out windows, hidden-window video pausing, and reduced-motion preferences.
