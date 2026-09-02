# Wallpaper, Library, and Pools

## Wallpaper file

The **Wallpaper file** setting selects the media used by the default appearance. Veil supports vault-local images, animated GIFs, and videos.

If **Wallpaper pool** is off, Veil uses that exact file. If the pool is on, the selected file becomes the **anchor** that tells Veil which folder should supply pool candidates.

## Wallpaper pool

A wallpaper pool randomly chooses supported media from the anchor wallpaper's folder.

The important behavior is that the random choice is **stable**. Veil does not reroll simply because you changed opacity, opened another setting, or refreshed the workspace. The same pool context keeps its current choice until one of these things happens:

- you use **Shuffle wallpaper pool**;
- the pool anchor/folder configuration changes;
- the selected file disappears from the candidate set;
- Veil needs a new selection for a genuinely different pool context.

When **Include subfolders** is off, only media directly inside the anchor file's folder is included. When it is on, descendant folders are included too.

If a pool has more than one candidate, a manual shuffle tries to avoid immediately selecting the same item again.

### Pool scope

Pools work for the **default appearance** and for individual **Scenes**.

A Scene keeps one stable pool selection for that Scene, even if many notes route to it. The default appearance likewise keeps its own default pool selection.

An **inline wallpaper rule** intentionally does not use the global/default wallpaper pool. Inline rules preserve the older behavior of replacing only one media path while using the rest of the global appearance.

## Wallpaper Library

Open the Library from **Wallpaper → Wallpaper library**, **Behavior → Quick actions**, or the Command Palette.

The Library has two sources: **Vault** and **Wallhaven**.

### Vault source

The Vault source scans supported media already inside the vault. Images use lazy-loaded previews. Videos use lightweight placeholders instead of decoding every video just to display the browser.

### Wallhaven source

The Wallhaven source is an optional SFW-only importer. It does not require a Wallhaven account or API key.

Nothing is downloaded automatically when you open the Library or switch to the Wallhaven source. Press **Search** to connect to Wallhaven. You can search by keyword and filter by category, minimum resolution, aspect ratio, and sort order.

Wallhaven returns up to 24 results per page. **Load more** requests the next page.

When you select a Wallhaven result, Veil downloads only that full-resolution image and saves it under:

`Wallpapers/Wallhaven/wallhaven-<id>.jpg` or `Wallpapers/Wallhaven/wallhaven-<id>.png`

The file is created through Obsidian's Vault API. Veil then applies the new **vault-local path** to the selected target. Normal wallpaper playback never depends on the remote Wallhaven URL.

If the same Wallhaven ID is already present at its deterministic local path, Veil reuses the existing file instead of downloading it again.

### Apply to

At the top of the Library, **Apply to** chooses what selecting a wallpaper will modify:

- **Default appearance**;
- any existing **Scene**;
- any wallpaper routing rule currently using **Inline wallpaper** mode.

The same target selector is used by both Vault and Wallhaven sources. Rules that already point to a Scene do not appear as separate Library targets because their media is owned by the Scene.

### Search and filters

For Vault media, you can search by vault-relative path and filter by:

- **All / Favorites / Recent**;
- top-level vault folder;
- **All media / Images / Videos**.

Sorting options are **Default order**, **Name**, **Newest modified**, and **Oldest modified**.

For Wallhaven, search requests are explicit and SFW-only. Veil never bulk-downloads results or preloads full-resolution originals.

### Favorites and Recent

Favorites are manual bookmarks. Recently Selected is updated when a wallpaper path is selected for the default appearance, a Scene, or an inline rule.

Veil keeps up to **128 Favorites** and **24 Recently Selected** entries. These lists live locally in Veil's `data.json` and are not included in portable settings exports.

A newly imported Wallhaven wallpaper becomes a normal vault file, so after import it can be favorited, routed, pooled, renamed, or deleted like any other local wallpaper.

### Random visible

**Random visible** applies to the Vault source and chooses from the currently filtered results that are presently loaded into the Library grid. The Library initially shows 60 items and loads 60 more at a time with **Show more**.

That means if a filter matches 300 files but only the first 60 are currently visible, **Random visible** chooses from those 60. Use **Show more** to expand the random-selection scope.

When more than one visible candidate exists, Random visible avoids the wallpaper currently selected for the active **Apply to** target when possible.

## Rename and delete behavior

If a selected media file or containing folder is renamed inside the vault, Veil updates configured wallpaper paths, rule paths, Favorites, Recent entries, and active pool selections where possible.

If media is deleted, Veil removes matching Favorites/Recent entries. A routed source that becomes unavailable does not immediately erase the last working wallpaper; Veil retains the last successfully loaded media while the configured source is unavailable.

## When Shuffle says the current appearance has no pool

The Shuffle command works only when the active result is the default appearance or a Scene with **Wallpaper pool** enabled. If the current route is an inline wallpaper rule, there is no active pool to shuffle even if the default appearance has a pool enabled.

See [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md) for the Scene/inline distinction.
