# Veil prerelease smoke test

Use the `veil-prerelease-<sha>` artifact produced by the **Verify Veil** workflow. Install exactly its `main.js`, `manifest.json`, and `styles.css` into a disposable Obsidian test vault.

## Baseline

- Enable Veil with no existing `data.json`: Obsidian should load normally and Veil should show its default empty state without console errors.
- Select one static image, one animated GIF, and one MP4/WebM video in turn. Each should appear behind the workspace without changing vault files.
- Disable Veil, re-enable it, then disable/re-enable the plugin itself. No stale wallpaper layer or pane-opacity class should remain after disable/unload.

## Windows and navigation

- Open a pop-out window and keep a different note active in each window. Note/path/tag/property rules should resolve independently per window.
- Close the pop-out while video or a transition is active. Playback/layers should disappear with the window and the main window should remain unaffected.
- Navigate A → B → C rapidly while B is still loading. A should remain visible until C is ready; there should be no blank flash.
- Rename and delete a configured wallpaper file while Veil is running. The previous working wallpaper should remain visible when the configured source becomes unavailable.

## Scenes and adaptive routing

- Create, duplicate, reorder, edit, and delete Scenes. A duplicate must have a fresh ID/name and preserve the complete appearance.
- Route Scenes by note name, exact path, folder, tag, and frontmatter property.
- Verify manual **Switch scene** overrides routing for the session and **Follow context rules** restores automatic routing.
- Verify `@theme=light|dark`, `@day`, `@time`, and `@schedule`; include one overnight schedule crossing midnight.
- Enter malformed enabled system expressions such as `@theme=blue`, `@time=25:00-06:00`, and `@schedule=funday 08:00-18:00` in both wallpaper routes and opacity exclusions. Settings should show a warning and the malformed rule must not match at runtime.

## Pools and library

- Enable a wallpaper pool, navigate away/back, and change only opacity/effects. The selected pool item should remain stable until Shuffle or a pool anchor/scope change.
- Rename the currently selected pool media (and separately a parent folder containing it). Veil should keep that same media selected at its new path rather than rerolling the pool.
- Delete the currently selected pool media and confirm Veil selects another valid candidate without a blank wallpaper.
- Open Wallpaper Library with a large media folder. Search/filter/sort, Favorites, Recent, **Random visible**, and **Show more** should remain responsive.
- Apply Library selections separately to Default appearance, a Scene, and an inline wallpaper rule; unrelated targets must stay unchanged.

## Effects and motion

- Check focal X/Y, zoom, fill/fit/center/stretch/scale-down, vignette, blur, dim, overlay, retro, glitch, and TV noise.
- Enable OS reduced motion. Crossfades and motion-heavy effects should stop; video should pause when the Scene respects reduced motion.
- Hide/minimize Obsidian with **Pause video when hidden** enabled and confirm video pauses/resumes correctly.

## Settings persistence

- Export settings, restore defaults, then import the export. Scenes/rules/appearance should round-trip; Favorites/Recent and the manual Scene override should remain local/session-only as documented.
- Import a schema-1 Veil 1.3 export and confirm legacy inline wallpaper rules keep their old semantics.
- Restart Obsidian and confirm settings, Scenes, routes, Favorites, and Recent persist without duplicate IDs or lost ordering.

## Pass criteria

A release candidate passes only if there are no console exceptions, no blank/stale wallpaper after transitions or window close, no unexpected pool rerolls, no settings/data loss, and the exact tested commit is green in **Verify Veil**.
