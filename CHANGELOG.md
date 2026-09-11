# Changelog

All notable changes to Veil are documented here.

## 1.5.0 — 2026-09-11

### Added

- Added an optional SFW Wallhaven browser to Wallpaper Library with explicit search, category, minimum-resolution, ratio, and sort controls.
- Added deterministic local Wallhaven imports under `Wallpapers/Wallhaven/`, so selected wallpapers are downloaded into the vault before use and runtime playback remains fully local.
- Added Wallpaper Library pagination for both vault and Wallhaven sources, with twenty wallpapers per desktop page and a five-column desktop grid.
- Added a Metadata toggle in Wallpaper Library so filename/path details can be shown only when needed.

### Changed

- Enlarged Wallpaper Library cards and previews, tightened toolbar alignment, and improved the `Apply to` target-row spacing.
- Limited `Random visible` to the wallpapers rendered on the current page.
- Hardened wallpaper-pool cache invalidation so unrelated vault churn no longer clears every candidate cache.
- Preserved reusable candidate scans when pool settings change and evicted only pool scopes that are no longer used.
- Reduced active-file/context work by skipping metadata-cache handling before workspace layout is ready and reusing cheap per-document file lookups.
- Reworked Wallhaven pagination so subsequent pages stay bound to the last explicit search and duplicate results are filtered.

### Security and reliability

- Isolated network access to the optional Wallhaven importer and kept `src/main.ts` free of Wallhaven runtime dependencies.
- Restricted Wallhaven requests to Obsidian `requestUrl`, validated approved hosts and HTTP responses, and rejected unsupported or malformed image payloads.
- Added MIME and JPEG/PNG signature checks before Wallhaven files are accepted into the vault.
- Serialized full-resolution Wallhaven downloads and protected newer target selections from stale download completions.
- Reused already-imported Wallhaven files instead of downloading them again.

### Verification

- Full lint, test, build, syntax, and production-bundle verification passes on the release-prep head.
- Desktop smoke testing was completed successfully before promotion to release.

## 1.4.0 — 2026-09-02

- Previous stable release.
