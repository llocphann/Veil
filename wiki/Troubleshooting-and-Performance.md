# Troubleshooting and Performance

## Check Wallpaper status first

In **Settings → Veil → Wallpaper**, the **Wallpaper status** row reports the active source and common load errors. In **Routing → Active context**, Veil also reports which default appearance, rule, Scene, or manual override currently won.

Those two rows usually identify whether the problem is media loading or routing.

## Common problems

| Problem | Likely cause | What to do |
| --- | --- | --- |
| No wallpaper appears | Veil is disabled or no valid media is selected | Enable wallpaper and choose a supported vault-local file. |
| “File not found in this vault” | Stored path no longer exists | Re-select the media or rename/move it through Obsidian so Veil can track the change. |
| Path/URL rejected | Source is absolute, remote, protocol-prefixed, or escapes the vault | Use a vault-relative media path. |
| Unsupported format | File extension is not supported | Use a supported image/video format. |
| Video will not play | Codec is unsupported or autoplay was interrupted | Try **Reload wallpaper**; if needed convert/use MP4 or WebM with a common codec. |
| Pool Shuffle says no pool is active | Current result is an inline rule or pool is disabled | Enable a pool on the active default appearance/Scene, or switch away from inline routing. |
| An `@theme`/time rule does not override a note rule | Adaptive rules are fallbacks | This is expected; ordinary note/path/folder/tag/frontmatter rules have higher priority. |
| A wallpaper changes but effects do not | Rule is using Inline wallpaper mode | Route to a Scene when you want the complete appearance to change. |
| Text/icons become too transparent | **Pane & content opacity** is low | Raise it, use **Pane background opacity** instead, or add an opacity exclusion. |
| Video/effects stop moving | Window is hidden, wallpaper opacity is 0%, or reduced motion is active | Check Behavior settings and OS reduced-motion preference. |
| GIF keeps animating under reduced motion | GIF animation cannot be paused reliably by Veil | Use a video format if pausing motion is required. |

## Video compatibility

Veil recognizes `mp4`, `webm`, `ogv`, `m4v`, and `mov`, but playback ultimately depends on codecs supported by Obsidian's desktop runtime.

For the most predictable result, use MP4 or WebM. A file can have a supported extension and still fail if its internal codec is unavailable.

Videos loop muted and without controls.

## Safe loading and rapid navigation

Veil does not immediately discard the old wallpaper when a new route is requested. It preloads the incoming source and keeps the last working source until the new one is ready.

If navigation changes again before that media finishes loading, Veil can retain the previous working wallpaper rather than flashing blank intermediate states.

If the incoming image or video errors, Veil returns to the previous working wallpaper whenever possible.

## Performance guide

The cost of wallpaper rendering depends on media resolution, window size, GPU, codec, number of Obsidian windows, blur amount, and whether effects animate.

| Feature | Typical cost | Notes |
| --- | --- | --- |
| Wallpaper/pane opacity | Low | Mostly compositing. |
| Dim | Low | Simple media brightness filter. |
| Color overlay | Low | Non-normal blend modes add some compositing work. |
| Vignette | Low | Static overlay. |
| Retro film | Low–moderate | Static filtering plus film-style layer. |
| Blur | Moderate–high GPU | Cost rises with blur radius, media resolution, and number of windows. |
| Video | Moderate CPU/GPU | Depends strongly on codec and resolution. |
| Animated GIF | Moderate CPU/GPU | Veil cannot pause GIF animation. |
| Glitch / TV noise | High GPU | Continuously animated unless motion is paused. |
| Video + strong blur + animated preset | Highest | Most likely combination to stutter on integrated graphics or battery power. |

## Recommended low-cost setup

Use a static image, keep blur low/off, avoid Glitch/TV noise, and leave **Pause video when the app is hidden** plus **Respect reduced motion** enabled.

If you use video, choose a reasonable resolution instead of a source far larger than the display.

## Why pool/library performance stays reasonable

Veil is event-driven rather than continuously polling the vault. Repeated refresh requests are coalesced into an animation frame.

Wallpaper pools cache candidate paths. The Wallpaper Library is created only when opened, initially renders 60 results, loads additional results in batches of 60, lazy-loads image previews, and does not decode every video for thumbnails.

Time/day/schedule routing uses a one-shot timer for the next meaningful boundary rather than checking the clock every few seconds.

## Multi-window behavior

Each main/pop-out window has its own wallpaper document state and resolves its own active root note and theme. This is intentional and allows different windows to display different Scenes.

If a pop-out appears to route differently, compare its active note with the main window and inspect the main **Active context** status when debugging the main workspace.

## If a theme makes panes look wrong

Veil adjusts scoped pane opacity around the existing Obsidian/theme UI rather than replacing the theme. Extremely customized themes can still make a particular opacity combination look different than expected.

First set **Pane & content opacity** to 100%, then adjust **Pane background opacity**. This isolates whether the issue comes from whole-pane fading or only pane surfaces.

## Resetting a broken configuration

Before resetting, use **Export settings** if you may want to inspect or restore the configuration later.

Then use **Data & recovery → Restore defaults**. This resets Veil configuration without deleting your wallpaper media or local Library Favorites/Recent metadata.

See [Data, Privacy, and Recovery](Data-Privacy-and-Recovery.md) for backup/import details.
