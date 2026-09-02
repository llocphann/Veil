# Data, Privacy, and Recovery

## Export settings

Use **Data & recovery → Export settings** to download a portable JSON backup.

The export contains Veil's portable configuration:

- global/default appearance;
- Scenes;
- wallpaper routing rules;
- opacity exclusions.

The file includes a Veil format identifier, schema version, plugin version, and export timestamp so future imports can validate it safely.

Current exports use settings schema **2**.

## What is not exported

Portable settings exports do **not** embed:

- wallpaper image/GIF/video files;
- Favorites;
- Recently Selected history;
- the temporary manual Scene override.

Wallpaper paths in the export still point to vault-relative locations, so an imported configuration expects the corresponding media to exist in the target vault at those paths.

## Import settings

Use **Import settings** to replace the portable Veil configuration with a JSON backup.

Veil validates the file before applying it. Imports are limited to **1 MB** and to the same collection limits used by the UI:

- 64 Scenes;
- 96 wallpaper rules;
- 96 opacity exclusions.

Duplicate internal IDs and invalid/out-of-range values are normalized during import.

Veil 1.4 automatically migrates schema-1 backups from Veil 1.3. Old wallpaper rules remain inline wallpaper rules, preserving their original media-only behavior.

If a file is malformed, is not a Veil export, uses an unsupported schema, or exceeds a collection limit, Veil rejects it instead of partially applying it.

## Restore defaults

**Restore defaults** clears the configured wallpaper, Scenes, and rules and returns appearance/behavior controls to Veil's defaults.

Restore defaults does **not** delete or modify media files in the vault. Favorites and Recently Selected are stored separately as local Library metadata and are not cleared by this action.

## Local Library data

Favorites and Recent are stored inside Veil's plugin `data.json` along with settings, but they are intentionally treated as local convenience metadata rather than portable configuration.

Veil keeps at most 128 Favorites and 24 Recent paths.

## Privacy model

Veil is designed around vault-local media.

It reads:

- configured wallpaper media stored in the vault;
- file paths needed for routing;
- Obsidian's already-indexed active-note tags and frontmatter needed by configured rules;
- the active light/dark theme state;
- the local computer date/time when adaptive rules are configured.

Veil does **not**:

- make network requests for wallpaper media;
- send telemetry or analytics;
- upload vault metadata;
- modify wallpaper media files;
- install or update itself;
- allow wallpaper URLs or paths outside the vault.

## Path safety

Wallpaper paths must be vault-relative. URLs, protocol-prefixed paths, absolute paths, and `..` traversal outside the vault are rejected.

Wiki-style wallpaper paths such as `[[Media/wallpaper.webp]]` are normalized when settings are loaded/imported, but the stored result remains a normal vault-relative path.

## Rename safety

When a configured media path or folder is renamed inside Obsidian, Veil updates affected global wallpaper paths, Scene wallpaper paths, inline-rule wallpaper paths, path/folder routing values, opacity-exclusion path/folder values, Library metadata, and pool selections where possible.

This makes normal vault organization changes much less likely to break a Veil setup.

## Backup recommendation

Export Veil settings after building a large Scene/routing setup or before making major structural changes to the vault. Keep the wallpaper media backed up with the vault itself because Veil's JSON export contains paths, not the media binaries.
