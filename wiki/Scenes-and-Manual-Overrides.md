# Scenes and Manual Overrides

A **Scene** is a reusable complete Veil appearance. In Veil 1.7, Scenes live under **Automation → Scenes**.

## What a Scene stores

A Scene keeps these settings together:

- wallpaper file or wallpaper pool;
- explicit pool folder, optional subfolders, and change interval;
- display mode, focal point, and zoom;
- wallpaper/pane opacity;
- transition;
- vignette, blur, dim, overlay, and effect preset;
- video and reduced-motion behavior.

Veil supports up to **64 Scenes**.

## Scene pools in 1.7

When **Wallpaper pool** is enabled inside a Scene, configure:

- **Wallpaper folder** — the vault folder used by that Scene;
- **Include subfolders** — include descendant folders;
- **Change interval** — automatic rotation every 5–120 minutes.

The Scene's saved wallpaper file is preserved even while the pool is enabled and can be used again when the pool is turned off or as a fallback if no valid pool candidate exists.

## Scene actions

**Add scene from current appearance** — create a Scene from the current global setup.

**Duplicate scene** — copy a Scene into a new independent Scene with its own ID.

**Copy current global appearance** — replace the Scene's wallpaper, pool, framing, opacity, effects, transition, and video behavior with the current global appearance while keeping the Scene name/identity.

**Delete scene** — removes the Scene. Rules that referenced it fall back to inline wallpaper behavior using the Scene's wallpaper path when possible.

## Scene vs inline wallpaper

| | Scene route | Inline route |
| --- | --- | --- |
| Changes wallpaper | Yes | Yes |
| Own framing/effects/opacity | Yes | No — uses global |
| Own transition/video behavior | Yes | No — uses global |
| Own wallpaper pool | Yes | No |
| Own pool folder/interval | Yes | No |

Use a **Scene** when the whole atmosphere should change. Use **Inline wallpaper** when only the media should change.

## Manual Scene override

Use **Veil: Switch scene** from the Command Palette.

A manual Scene override:

- has the highest wallpaper-routing priority;
- is session-only;
- does not change saved Routing rules;
- is cleared by choosing **Follow context rules**.

Opacity exclusions still evaluate normally while a manual Scene is active.

## Recommended workflow

1. Finish the default Wallpaper and Appearance configuration.
2. Create and tune a Scene under **Automation → Scenes**.
3. Route notes/contexts to that Scene under **Automation → Wallpaper routing**.
4. Use **Automation → Active context** to verify which result is active.
