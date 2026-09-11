# Behavior and Video

The **Behavior** tab controls wallpaper transitions, video/motion handling, and quick actions.

## Wallpaper transition

**Wallpaper transition** ranges from 0–2000 ms.

- `0 ms` — switch immediately.
- Higher values — crossfade to the new wallpaper.

Veil keeps the previous working wallpaper visible while the incoming media loads. If the new source fails, the previous wallpaper stays visible.

## Video

Video wallpapers loop, are muted, and have no controls.

For the best compatibility, prefer **MP4** or **WebM**. Other supported containers still depend on codecs available in Obsidian's desktop runtime.

### Pause when hidden

When enabled, Veil pauses video work for hidden windows and resumes when they become visible again.

### Respect reduced motion

When enabled, Veil follows `prefers-reduced-motion`:

- video is paused;
- animated effects stop;
- wallpaper crossfades are disabled.

Animated GIFs cannot be paused reliably by Veil.

## Quick actions

**Reload wallpaper** — request the current wallpaper again. Useful after replacing a file or retrying video playback.

**Shuffle wallpaper pool** — choose another candidate from the currently active default/Scene pool. Inline wallpaper rules do not have a pool.

When wallpaper opacity is `0%`, Veil treats wallpaper motion as visually inactive and stops unnecessary motion work.

Scenes store their own transition and video/motion behavior, so a Scene can behave differently from the default appearance.
