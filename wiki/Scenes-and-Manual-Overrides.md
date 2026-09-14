# Scenes and Manual Overrides

A **Scene** is a reusable complete Veil appearance.

## What a Scene stores

A Scene keeps these settings together:

- wallpaper and pool;
- display mode, focal point, and zoom;
- wallpaper/pane opacity;
- transition;
- vignette, blur, dim, overlay, and effect preset;
- video and reduced-motion behavior.

Veil supports up to **64 Scenes**.

## Scene actions

**Add scene from current appearance** — create a Scene from the current global setup.

**Duplicate scene** — copy a Scene into a new independent Scene.

**Copy current global appearance** — replace the Scene's appearance with the current global one while keeping its name/identity.

**Delete scene** — removes the Scene. Rules that referenced it fall back to inline wallpaper behavior using the Scene's wallpaper path when possible.

## Scene vs inline wallpaper

| | Scene route | Inline route |
| --- | --- | --- |
| Changes wallpaper | Yes | Yes |
| Own framing/effects/opacity | Yes | No — uses global |
| Own transition/video behavior | Yes | No — uses global |
| Wallpaper pool | Yes | No |

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

1. Finish the default appearance.
2. Create and tune a Scene.
3. Route notes/contexts to that Scene.
4. Use **Routing → Active context** to verify which result is active.
