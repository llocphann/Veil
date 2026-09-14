# Data, Privacy, and Recovery

Veil 1.7 groups backup and recovery tools under **Data → Data & recovery**.

## Export and import

**Export settings** creates a portable JSON backup containing:

- default wallpaper/appearance/playback settings;
- default wallpaper-pool configuration, including folder, subfolder scope, and change interval;
- Scenes and their pool/appearance/playback settings;
- wallpaper routing rules;
- opacity exclusions.

Current exports use settings schema **2**.

The export does **not** include wallpaper files, Favorites, Recent history, or the temporary manual Scene override.

**Import settings** validates the file before replacing the portable configuration. Veil accepts files up to **1 MB** and enforces the normal limits: 64 Scenes, 96 wallpaper rules, and 96 opacity exclusions.

Older schema-1 Veil backups are migrated while preserving their inline-wallpaper behavior.

## Pool migration in 1.7

Pre-1.7 pools did not store a separate pool folder. When Veil normalizes older persisted settings, it derives the new **Wallpaper folder** from the saved wallpaper path when needed, including Scene pools.

This migration does not intentionally discard the saved wallpaper file. The file remains available when the pool is disabled and as a fallback when no valid pool candidate exists.

## Restore defaults

**Restore defaults** resets Veil configuration but does not delete wallpaper media from the vault. Local Favorites and Recent metadata are kept separately.

## Privacy

Normal Veil playback is vault-local. Veil does not send telemetry or analytics.

It reads only what is needed for configured behavior: wallpaper files, paths, active-note tags/frontmatter, theme state, and local date/time for adaptive rules.

### Wallhaven

**Wallpaper → Wallpaper library → Wallhaven** is the only built-in feature that intentionally uses the network.

- No request is made just because Veil or the Library opens.
- Search starts only when you explicitly search or move to an unloaded result page.
- Search terms and selected filters are sent to Wallhaven.
- Only the wallpaper you select is downloaded at full resolution.
- Note contents, frontmatter, tags, vault file lists, and routing state are not sent to Wallhaven.
- The browser is SFW-only and uses no Wallhaven API key.

Downloaded files are validated, saved under `Wallpapers/Wallhaven/`, then used as normal vault-local wallpapers.

## Path safety

Runtime wallpapers must use vault-relative paths. Veil rejects URLs, absolute paths, protocol-prefixed paths, and paths that escape the vault with `..`.

When media or relevant folders are renamed inside Obsidian, Veil updates affected configured paths and pool selections where possible. Wallpaper Library metadata is also rewritten where supported.

## Backup recommendation

Export settings after building a large Scene/Routing setup or before major configuration changes. Back up wallpaper media with the vault itself because the JSON export stores paths and configuration, not the media files.
