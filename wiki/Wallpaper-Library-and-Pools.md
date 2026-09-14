# Wallpaper, Library, and Pools

## Wallpaper file and pool

Without a pool, Veil uses the selected wallpaper exactly.

With **Wallpaper pool** enabled, that file becomes the anchor for its folder. Veil chooses supported media from the folder and keeps the choice **stable** until you shuffle, change the pool scope, or the selected file disappears.

**Include subfolders** adds descendant folders to the pool.

Pools work for the default appearance and for Scenes. Inline wallpaper rules do **not** inherit the global pool.

## Wallpaper Library

Open it from **Wallpaper**, **Behavior → Quick actions**, or the Command Palette.

The Library has two sources:

### Vault

Browse media already in the vault.

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

Scene-backed rules do not appear separately because the Scene owns their wallpaper.

## Favorites and Recent

- Favorites: up to **128** paths.
- Recent: up to **24** paths.

They are local Library metadata in `data.json` and are not included in portable settings exports.

Imported Wallhaven files become normal vault media: you can favorite, route, pool, rename, or delete them like any other wallpaper.
