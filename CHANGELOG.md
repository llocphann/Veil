# Changelog

## Unreleased

## 1.3.0

- Add permanently visible delete buttons to wallpaper routes and opacity exclusions.
- Add a configurable color overlay with safe blend modes.
- Add retro film, glitch, and TV-noise presets with reduced-motion handling.
- Add validated, schema-versioned JSON settings import and export.
- Coalesce repeated wallpaper refreshes into one animation frame.
- Document CPU/GPU costs and cap imported data for safer operation.

## 1.1.1

- Replace broad CSS overrides with scoped, higher-specificity pane selectors.
- Remove the relational `:has()` selector to avoid broad style invalidation.

## 1.1.0

- Organize settings into accessible Wallpaper, Effects, Video, Actions, and Support tabs.
- Add ordered wallpaper routing by note name, exact path, folder, or tag.
- Add context-specific exclusions for pane-background and whole-pane content opacity.
- Refresh wallpaper and opacity rules when the active file or its indexed tags change.
- Use Community-compatible Markdown for the Buy Me a Coffee button.
- Keep the settings support button on one yellow line at narrow widths.

## 1.0.0

- License the project under GNU GPL v3.0 only.
- Publish the maintained source as TypeScript.
- Support vault-local images, animated GIFs, and videos.
- Add fill, fit, center, stretch, and scale-down display modes.
- Add wallpaper, pane surface, and complete pane-content opacity controls.
- Add configurable vignette, blur, and dim effects.
- Apply wallpaper state to the main window and Obsidian pop-out windows.
- Pause videos when hidden or when reduced motion is requested.
- Move settings to Obsidian's declarative Settings API.
- Add official funding links in the manifest, README, and plugin settings.
- Verify every push and pull request before release, and validate workflow YAML in tests.
- Minify production bundles and verify their JavaScript syntax.
