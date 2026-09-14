# Troubleshooting and Performance

## Check these first

- **Wallpaper → Wallpaper status** — media/loading problems.
- **Automation → Active context** — which rule, Scene, or default appearance currently won.

## Common problems

| Problem | Fix |
| --- | --- |
| No wallpaper | Enable Veil and select supported vault-local media, or configure a valid pool folder. |
| File not found | Re-select the file or move/rename it through Obsidian. |
| Path/URL rejected | Use a vault-relative path. Remote/runtime URLs are not allowed. |
| Pool has no wallpaper | Check **Wallpaper folder**, supported media, and **Include subfolders**. Veil falls back to the saved wallpaper file when possible. |
| Pool does not rotate | A pool needs more than one candidate. Confirm **Change interval** is 5–120 minutes and that the active context is actually using that pool. |
| Video will not play | Try **Wallpaper → Quick actions → Reload wallpaper**; prefer MP4/WebM with a common codec. |
| Shuffle says no pool | The active appearance has no pool, or the active route is inline. |
| `@theme`/time rule loses | Expected when an ordinary note rule matches first. |
| Wallpaper changes but effects do not | Use a Scene instead of an inline wallpaper rule. |
| Text is too transparent | Raise **Pane & content opacity** or use **Automation → Opacity exclusions**. |
| GIF keeps moving | GIF animation cannot be paused reliably by Veil. |

## Wallhaven

Wallhaven does not search automatically. Open **Wallpaper → Wallpaper library → Wallhaven**, set filters, then press **Search**.

Selecting a result downloads and validates that image, saves it under `Wallpapers/Wallhaven/`, and then uses the local vault copy.

The Library shows **20 wallpapers per page**. **Random visible** uses only the current filtered Vault page.

## Performance model in Veil 1.7

Veil avoids broad or recurring work when the resolved result cannot change.

Key behaviors include:

- document context, Scene/Automation resolution, and wallpaper-source lookups are cached;
- rapid Settings slider changes are coalesced instead of causing a full update for every input event;
- unchanged media is reused instead of being reloaded or crossfaded again;
- workspace documents are tracked through a live registry rather than repeatedly rescanning all leaves;
- pool candidate scans are cached and invalidated only by relevant vault changes;
- automatic pool rotation uses one-shot due times rather than continuous polling;
- time/day/schedule Routing also wakes at meaningful boundaries rather than polling continuously;
- hidden animated work is reduced or paused where supported.

Typical visual cost from lowest to highest:

1. Opacity, dim, overlay, vignette.
2. Retro film.
3. Strong blur.
4. Video or animated GIF.
5. Glitch / TV noise.
6. Video + strong blur + animated preset.

For a light setup, use a static image, low/no blur, and no animated preset.

## Safe loading and reuse

Veil keeps the last working wallpaper visible until a replacement finishes loading. Failed or stale loads do not intentionally replace a newer working selection.

Changing only appearance values should keep the same media instance when its identity has not changed. Switching to a different file, Scene source, routed source, or due pool selection is what requires a media change.

## Reset

If configuration becomes difficult to diagnose:

1. Export settings if you may need them later.
2. Use **Data → Data & recovery → Restore defaults**.

This resets Veil configuration without deleting wallpaper media.
