# Behavior and Video

Veil 1.7 no longer has a separate **Behavior** tab. These controls are grouped under **Wallpaper**:

- **Playback & motion** — wallpaper transition, hidden-window video handling, and reduced-motion behavior.
- **Quick actions** — Reload wallpaper and Shuffle wallpaper pool.

## Wallpaper transition

**Wallpaper transition** ranges from 0–2000 ms.

- `0 ms` — switch immediately.
- Higher values — crossfade when the resolved wallpaper actually changes.

Veil keeps the previous working wallpaper visible while incoming media loads. If the new source fails, the previous working wallpaper remains visible.

Appearance-only updates do not intentionally reload unchanged media.

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

When wallpaper opacity is `0%`, Veil treats wallpaper motion as visually inactive and avoids unnecessary motion work.

## Quick actions

**Reload wallpaper** — force the current source to be requested again. Useful after replacing a file or retrying video playback.

**Shuffle wallpaper pool** — invalidate the current selection for the active default/Scene pool so another candidate can be selected. When multiple candidates exist, Veil avoids immediately repeating the previous selection when possible.

Inline wallpaper rules do not own a pool, so Shuffle has no pool to operate on while an inline route is active.

## Scene behavior

Scenes store their own transition and video/motion settings. Edit them under **Automation → Scenes**. A Scene can therefore use different playback behavior from the default appearance.

Scene pools also store their own **Change interval** from 5 to 120 minutes.
