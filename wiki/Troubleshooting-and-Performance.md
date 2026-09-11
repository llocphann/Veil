# Troubleshooting and Performance

## Check these first

- **Wallpaper → Wallpaper status** — media/loading problems.
- **Routing → Active context** — which rule, Scene, or default appearance currently won.

## Common problems

| Problem | Fix |
| --- | --- |
| No wallpaper | Enable Veil and select supported vault-local media. |
| File not found | Re-select the file or move/rename it through Obsidian. |
| Path/URL rejected | Use a vault-relative path. Remote/runtime URLs are not allowed. |
| Video will not play | Try **Reload wallpaper**; prefer MP4/WebM with a common codec. |
| Shuffle says no pool | The active appearance has no pool, or the route is inline. |
| `@theme`/time rule loses | Expected when an ordinary note rule matches first. |
| Wallpaper changes but effects do not | Use a Scene instead of an inline wallpaper rule. |
| Text is too transparent | Raise **Pane & content opacity** or use an opacity exclusion. |
| GIF keeps moving | GIF animation cannot be paused reliably by Veil. |

## Wallhaven

Wallhaven does not search automatically. Set filters and press **Search**.

Selecting a result downloads and validates that image, then saves it under `Wallpapers/Wallhaven/`. After import, playback is local.

The Library shows **20 wallpapers per page**. **Random visible** uses only the current filtered Vault page.

## Performance

Typical cost from lowest to highest:

1. Opacity, dim, overlay, vignette.
2. Retro film.
3. Strong blur.
4. Video or animated GIF.
5. Glitch / TV noise.
6. Video + strong blur + animated preset.

For a light setup, use a static image, low/no blur, and no animated preset.

Veil avoids unnecessary background work by using event-driven refreshes, cached pool scans, paginated Library rendering, lazy image previews, and one-shot timers for time/day/schedule routing.

## Safe loading

Veil keeps the last working wallpaper visible until a replacement finishes loading. Failed or stale loads do not intentionally replace a newer working selection.

## Reset

If configuration becomes difficult to diagnose:

1. Export settings if you may need them later.
2. Use **Data & recovery → Restore defaults**.

This resets Veil configuration without deleting wallpaper media.
