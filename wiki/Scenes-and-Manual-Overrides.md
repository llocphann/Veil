# Scenes and Manual Overrides

Scenes are the main way to create reusable complete Veil appearances.

## What a Scene stores

A Scene stores all of these together:

- wallpaper file;
- wallpaper pool and Include subfolders;
- display mode, focal point, and zoom;
- wallpaper, pane-background, and pane-content opacity;
- transition duration;
- vignette;
- blur and dim;
- color overlay and blend mode;
- effect preset and intensity;
- video pause behavior;
- reduced-motion behavior.

Because the entire appearance is stored together, a routing rule can switch from a bright daytime setup to a dark cinematic setup without rebuilding each setting.

Veil supports up to **64 Scenes**.

## Create a Scene

Use **Scenes → Add scene from current appearance**.

The new Scene copies the current global/default appearance at the moment it is created. Later global changes do not automatically update the Scene.

Give the Scene a clear name such as `Focus`, `Reading`, `Cinema`, or `Night` before using it in Routing.

## Scene status

A Scene needs a supported wallpaper file. The Scene list shows whether it is ready, uses a pool, or still needs a wallpaper.

If a Scene has **Wallpaper pool** enabled, its selected wallpaper file acts as the pool anchor. See [Wallpaper, Library, and Pools](Wallpaper-Library-and-Pools.md).

## Duplicate Scene

**Duplicate scene** creates a new independent Scene immediately after the original. It receives a new internal ID but copies the complete wallpaper, pool, appearance, transition, and video configuration.

Use Duplicate when you want a variation—for example, duplicate `Focus`, rename it `Focus Night`, then change only dim/overlay settings.

## Copy current global appearance

**Copy current global appearance** overwrites the Scene's complete appearance with the current global/default appearance while keeping the Scene's existing name and identity.

This operation replaces the Scene's wallpaper, pool configuration, framing, opacity, effects, transition, and video behavior. Use it when you deliberately want the Scene to catch up with the global setup.

## Delete Scene

When you delete a Scene, routing rules that referenced it are not simply destroyed. Veil converts those rules to **inline wallpaper** rules using the deleted Scene's wallpaper path as a fallback.

The complete Scene-specific appearance is gone, so those rules then use the global/default appearance around that wallpaper.

## Scene vs inline wallpaper

This distinction is important:

| | Scene route | Inline wallpaper route |
| --- | --- | --- |
| Changes wallpaper | Yes | Yes |
| Own framing/zoom | Yes | No — uses global |
| Own opacity/effects | Yes | No — uses global |
| Own transition/video behavior | Yes | No — uses global |
| Can use wallpaper pool | Yes | No |
| Best use | Complete reusable atmosphere | Simple media-only replacement |

If you only want one note to show another image but keep the same global look, use an inline rule. If the note should change the entire appearance, route it to a Scene.

## Manual Scene override

Use **Veil: Switch scene** from the Command Palette to temporarily force a Scene.

The switcher always includes **Follow context rules** plus every configured Scene.

A manual Scene override has the highest wallpaper-routing priority. While it is active, note-specific and adaptive wallpaper routes remain configured but do not control the wallpaper appearance.

The override is **session-only**: it is not written into Veil settings and is not included in exports. Choose **Follow context rules** to clear it immediately and return to automatic routing.

## Manual override and opacity exclusions

The Scene override changes the resolved appearance, but opacity exclusions still evaluate the active note/system context independently. This means an opacity exclusion can still keep a pane fully opaque while a manually forced Scene is active.

## Suggested workflow

1. Finish the global/default appearance first.
2. Create a Scene from it.
3. Modify the Scene until it looks right.
4. Add a routing rule and choose that Scene as **Appearance source**.
5. Use **Routing → Active context** to verify which route is currently selected.
6. Use **Switch scene** only for temporary overrides, not as a replacement for permanent Routing.

Next: [Routing and Opacity Exclusions](Routing-and-Opacity-Exclusions.md).
