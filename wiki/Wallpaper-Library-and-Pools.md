# Wallpaper, Library, and Pools

## Wallpaper file and pool

Without a pool, Veil uses the selected **Wallpaper file** exactly.

With **Wallpaper pool** enabled, Veil 1.7 uses a separate pool configuration:

- **Wallpaper folder** — the vault folder scanned for candidates.
- **Include subfolders** — include supported media from descendant folders.
- **Change interval** — automatically rotate every 5 to 120 minutes.

The selected wallpaper file is preserved when the pool is enabled. Turning the pool off restores normal file-based behavior, and the saved file can also be used as a fallback if the pool has no valid candidates.

The pool selection stays stable until one of these happens:

- its scheduled change interval becomes due;
- you use **Shuffle wallpaper pool**;
- the pool folder/scope changes;
- the current candidate is removed or becomes invalid.

When more than one candidate exists, Veil avoids immediately reselecting the previous candidate when possible.

Pools work for the default appearance and for Scenes. Inline wallpaper rules do **not** inherit the global pool.

## Automatic rotation

The default interval is **30 minutes**. Each default/Scene pool stores its own interval.

Veil does not poll continuously. It schedules the next due pool boundary and refreshes only contexts using a due pool. A pool with zero candidates falls back to its saved wallpaper file; a pool with one candidate does not need to rotate.

## Wallpaper Library

Open it from **Wallpaper → Wallpaper library** or the Command Palette command **Veil: Open wallpaper library**.

The Library has two sources:

### Vault

Browse supported media already in the vault.

You can:

- search by path;
- filter **All / Favorites / Recent**;
- filter by top-level folder and media type;
- sort by default order, name, newest, or oldest;
- show/hide metadata;
- use **Random visible**.

The Library shows **20 wallpapers per page**. On desktop, the grid uses up to five columns.

**Random visible** chooses only from the current page after filters are applied and avoids the currently selected wallpaper when possible.

### Wallhaven

Wallhaven browsing is optional and **SFW-only**. No account or API key is required.

Nothing is searched automatically. Enter a query or filters, then press **Search**.

Available filters include:

- category;
- minimum resolution;
- aspect ratio;
- sort order.

Results use the same 20-item Library pagination. Moving to an unloaded page requests more results from the last explicit search.

Selecting a result downloads only that full-resolution image, validates it, and saves it under:

`Wallpapers/Wallhaven/`

Veil then uses the local vault copy. If the same deterministic file already exists, it is reused.

## Apply to

**Apply to** can target:

- Default appearance;
- any Scene;
- an inline wallpaper routing rule.

Scene-backed rules do not appear separately because the Scene owns their wallpaper and pool configuration.

## Favorites and Recent

- Favorites: up to **128** paths.
- Recent: up to **24** paths.

They are local Library metadata in `data.json` and are not included in portable settings exports.

Imported Wallhaven files become normal vault media: you can favorite, route, pool, rename, or delete them like any other wallpaper.

## Upgrading old pools to 1.7

Pre-1.7 pools used the selected wallpaper path as the pool-folder anchor. During normalization, Veil derives the new explicit **Wallpaper folder** from that saved path while preserving the original wallpaper file. The same migration applies to Scene pools.
