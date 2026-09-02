# Behavior and Video

The **Behavior** tab controls transitions, video/motion handling, and quick actions.

## Wallpaper transition

**Wallpaper transition** sets the crossfade duration from 0 to 2000 ms.

- `0 ms` switches immediately.
- Higher values fade between the old and new wallpaper.

Transitions apply when rules change, Scenes change, and wallpaper pools are shuffled.

Veil uses a retained/double-buffered transition. The currently working wallpaper stays visible while the incoming image or video loads. The crossfade starts only after the new media is ready.

If the incoming media fails, Veil discards it and restores the previous working wallpaper instead of leaving an empty background. During rapid navigation, Veil also avoids replacing a working wallpaper with an intermediate source that never finishes loading.

## Video playback

Video wallpapers loop, are muted, have no controls, and play inline inside the workspace background.

For broad compatibility, prefer MP4 or WebM. MOV, M4V, and OGV support depends on codecs available in the local Obsidian desktop runtime.

## Pause video when the app is hidden

When enabled, Veil pauses video decoding for a document/window that is hidden. This reduces unnecessary CPU/GPU usage when Obsidian or a pop-out window is not visible.

When the window becomes visible again, Veil attempts to resume playback.

## Respect reduced motion

When enabled, Veil follows the operating system's `prefers-reduced-motion` request.

Reduced-motion mode:

- pauses video;
- pauses motion-heavy effect animation;
- disables wallpaper crossfades.

Animated GIF files are different from video: Veil cannot reliably pause GIF animation.

## Video autoplay problems

If the video is valid but autoplay was interrupted or blocked, use **Reload wallpaper**. If it still fails, the most likely cause is codec/runtime compatibility; try MP4 or WebM with a common codec.

Veil reports load/playback problems in the **Wallpaper status** row.

## Quick actions

### Reload wallpaper

Forces the current wallpaper source to be requested again. Use it after modifying/replacing a media file, after a transient load error, or when retrying video playback.

### Shuffle wallpaper pool

Clears the current stable pool selection so Veil chooses another candidate. When more than one candidate exists, Veil tries not to immediately repeat the previous item.

Shuffle only works when the currently resolved appearance is the default appearance or a Scene with its pool enabled. Inline wallpaper rules do not use a pool.

## Motion can also stop at 0% wallpaper opacity

When wallpaper opacity is 0%, Veil treats the wallpaper as visually inactive and stops video/motion work even if the media remains configured.

## Per-Scene behavior

Scenes store their own transition duration, pause-when-hidden setting, and reduced-motion setting. A Scene can therefore behave differently from the default appearance.

See [Scenes and Manual Overrides](Scenes-and-Manual-Overrides.md).
