# Data, Privacy, and Recovery

## Export and import

**Data & recovery → Export settings** creates a portable JSON backup containing:

- default appearance;
- Scenes;
- wallpaper routing rules;
- opacity exclusions.

Current exports use settings schema **2**.

The export does **not** include wallpaper files, Favorites, Recent history, or the temporary manual Scene override.

**Import settings** validates the file before replacing the portable configuration. Veil accepts files up to **1 MB** and enforces the normal limits: 64 Scenes, 96 wallpaper rules, and 96 opacity exclusions.

Older schema-1 Veil backups are migrated while preserving their inline-wallpaper behavior.

## Restore defaults

**Restore defaults** resets Veil configuration but does not delete wallpaper media from the vault. Local Favorites and Recent metadata are kept separately.

## Privacy

Normal Veil playback is vault-local. Veil does not send telemetry or analytics.

It reads only what is needed for configured behavior: wallpaper files, paths, active-note tags/frontmatter, theme state, and local date/time for adaptive rules.

### Wallhaven

**Wallpaper Library → Wallhaven** is the only built-in feature that intentionally uses the network.

- No request is made just because Veil or the Library opens.
- Search starts only when you explicitly search or move to an unloaded result page.
- Search terms and selected filters are sent to Wallhaven.
- Only the wallpaper you select is downloaded at full resolution.
- Note contents, frontmatter, tags, vault file lists, and routing state are not sent to Wallhaven.
- The browser is SFW-only and uses no Wallhaven API key.

Downloaded files are validated, saved under `Wallpapers/Wallhaven/`, then used as normal vault-local wallpapers.

## Path safety

Runtime wallpapers must use vault-relative paths. Veil rejects URLs, absolute paths, protocol-prefixed paths, and paths that escape the vault with `..`.

When media or relevant folders are renamed inside Obsidian, Veil updates affected configured paths and Library metadata where possible.

## Backup recommendation

Export settings after building a large Scene/Routing setup. Back up wallpaper media with the vault itself because the JSON export stores paths, not media files.
