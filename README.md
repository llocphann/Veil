# Veil

Veil adds vault-local image, animated GIF, and video wallpapers to Obsidian. It can change the complete look of your workspace automatically with reusable **Scenes**, note-aware **Routing**, wallpaper pools, and visual effects.

<p align="center">
  <img src="assets/homepage.png" alt="Veil wallpaper behind an Obsidian workspace" width="82%">
</p>

> Veil is desktop-only. Wallpaper media always stays inside your vault after selection.

## Highlights

- Use images, animated GIFs, or videos stored in the current vault.
- Search and import SFW wallpapers from **Wallhaven** directly from the Wallpaper Library.
- Create **Scenes** that save wallpaper, framing, opacity, effects, transitions, and video behavior together.
- Route a wallpaper or Scene by note name, path, folder, tag, frontmatter, theme, day, or time.
- Build stable random wallpaper pools and shuffle them when you want a new choice.
- Browse vault media in the **Wallpaper Library** with search, Favorites, Recent, filters, sorting, and random selection.
- Adjust focal point, zoom, display mode, wallpaper opacity, pane opacity, vignette, blur, dim, color overlay, and effect presets.
- Use Veil in the main window and Obsidian pop-out windows, with each window resolving its own context.

## Installation

### Obsidian Community Plugins

If Veil is available in the Community Plugins directory, open **Settings → Community plugins → Browse**, search for **Veil**, then install and enable it.

### GitHub release

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest Veil release.
2. Place the three files in `<vault>/.obsidian/plugins/veil/`.
3. Reload Obsidian and enable **Veil** under Community plugins.

## Quick start

1. Open **Settings → Community plugins → Veil**.
2. In **Wallpaper**, choose a vault image, GIF, or video, or open **Wallpaper Library → Wallhaven** to import an SFW wallpaper.
3. Use **Appearance** to adjust framing, opacity, and effects.
4. Use **Scenes** when you want reusable complete looks.
5. Use **Routing** when Veil should change automatically for different notes or contexts.

Veil also adds these commands to the Command Palette: **Reload wallpaper**, **Shuffle wallpaper pool**, **Open wallpaper library**, and **Switch scene**.

## Documentation

The detailed user guide is in the [Veil Wiki](wiki/Home.md).

Start with:

- [Getting started](wiki/Getting-Started.md)
- [Wallpaper, Library, and Pools](wiki/Wallpaper-Library-and-Pools.md)
- [Appearance and Effects](wiki/Appearance-and-Effects.md)
- [Scenes and Manual Overrides](wiki/Scenes-and-Manual-Overrides.md)
- [Routing and Opacity Exclusions](wiki/Routing-and-Opacity-Exclusions.md)
- [Behavior and Video](wiki/Behavior-and-Video.md)
- [Data, Privacy, and Recovery](wiki/Data-Privacy-and-Recovery.md)
- [Troubleshooting and Performance](wiki/Troubleshooting-and-Performance.md)

## Roadmap to 2.0 — complete on `dev`

Veil 2.0 was developed as a refinement release rather than a feature-expansion release. The existing feature set already covered the main wallpaper workflow, so development from 1.6 through 2.0 focused on lower runtime cost, cleaner internal boundaries, deterministic state handling, and stronger regression guarantees.

### 1.6 — Architecture decomposition — complete on `dev`

Architecture decomposition is complete on the development branch. The main runtime and Settings hotspot have been reduced into smaller ownership-focused modules while preserving behavior under the full verification suite.

- Reduce the amount of orchestration and state ownership concentrated in `main.ts`.
- Split settings and Wallpaper Library responsibilities into smaller, independently testable modules.
- Preserve existing behavior while clarifying ownership between context resolution, wallpaper pools, media lifecycle, document application, and persistence.
- Avoid user-facing feature additions unless they are required to complete the refactor safely.

### 1.7 — Runtime invalidation and no-op fast paths — complete on `dev`

Runtime invalidation now uses document-scoped scheduling for context, Settings, vault, and pool changes. Stable render signatures suppress unchanged DOM/playback work, no-op settings return before subsystem work, routing timers retain unchanged boundaries, and multi-window updates are limited to documents whose resolved output is affected.

- Replace broad refresh work with explicit invalidation for context, source, appearance, playback, layout, and pool state.
- Add stable runtime signatures so unchanged context or appearance produces no DOM or media work.
- Restrict multi-window updates to the documents whose resolved state actually changed.
- Continue reducing metadata-cache and vault-event work on hot paths.

### 1.8 — Media lifecycle and transition efficiency — complete on `dev`

Media identity is now independent from routing, Scene, appearance, and playback identity. Unchanged media is reused without replacing `src`, calling `load()`, reallocating the layer, or restarting a crossfade; playback uses its own stable signature, lifecycle phases are explicit from loading through disposal, and stale media events are guarded against superseded document state.

- Formalize media states from resolution and load through transition, active playback, and disposal.
- Keep media identity separate from appearance and playback identity so visual changes do not reload unchanged images or videos.
- Audit image, GIF, and video allocation, playback, cleanup, and stale-load behavior.
- Ensure unchanged video sources do not restart when only visual settings change.

### 1.9 — State, UI efficiency, and release hardening — complete on `dev`

Persisted plugin data now has an explicit deterministic migration pipeline. Settings routing toggles and Wallpaper Library interactions avoid full rerenders when local DOM-state refreshes are sufficient, regression tests lock work-count fast paths, development builds expose a local runtime work profiler that is excluded from production, and animated CSS effects are constrained by hidden-window and reduced-motion idle policies.

- Version the persisted settings schema and use explicit, deterministic migrations.
- Reduce unnecessary Settings and Wallpaper Library rerenders and DOM churn.
- Add regression tests that measure unnecessary work, not only functional output.
- Add development-only performance instrumentation without telemetry or analytics.
- Audit CSS effects and compositing so an idle Veil remains effectively idle.

### 2.0 — Stability contract — complete on `dev`

The 2.0 stability contract is now enforced by dedicated regression coverage. Runtime refreshes use stable no-op boundaries; active-leaf, file, layout, metadata, theme, Settings, and vault changes are scoped to affected documents or caches; unchanged media is reused across appearance changes; hidden visual effects pause; persisted data follows an explicit migration path; and release versioning derives from published release history instead of stale candidate metadata.

1. A no-op context refresh performs no meaningful work.
2. Appearance-only changes never reload unchanged media.
3. A context change invalidates only affected windows and documents.
4. Vault changes invalidate only relevant media and wallpaper-pool caches.
5. Idle operation has no unnecessary recurring timers, animation, DOM mutation, or vault scanning.
6. Every persisted-data version has a deterministic migration path.

Features such as additional wallpaper providers, cloud services, image editing, scripting, shader-heavy effects, Scene nesting, or a substantially more complex routing DSL remain intentionally outside the 2.0 scope unless they become necessary for the core wallpaper experience.

### Development branches

Veil uses an explicit three-stage promotion flow:

`dev` → `prerelease` → `stable`

- `dev` is the integration branch. Every push runs the full verification workflow, but it does not create a smoke-test bundle or publish a release.
- `prerelease` is the manual smoke-test gate. Promoting a verified `dev` state here runs verification again and uploads a short-lived `main.js` / `manifest.json` / `styles.css` bundle for manual testing.
- Smoke testing is performed manually before any promotion to `stable`; there is no automatic `dev` → `prerelease` or `prerelease` → `stable` branch promotion.
- `stable` is the default and release branch. A manually promoted prerelease candidate is checked against the current `prerelease` source, verified again, versioned from published release history when needed, tagged, attested, and published.
- Stable release source must match the smoke-tested `prerelease` tree, preventing direct untested changes on `stable` from becoming a release.

## Privacy

Veil reads vault-local wallpaper media and Obsidian metadata needed by your configured rules. Normal wallpaper playback does not require the network, and Veil does not collect telemetry or run analytics.

Veil connects to Wallhaven only when you use the optional Wallhaven browser in **Wallpaper Library**. Search terms and selected filters are sent to `wallhaven.cc`; result thumbnails load from Wallhaven, and the full image is downloaded only when you explicitly select it. Imported wallpapers are saved inside your vault under `Wallpapers/Wallhaven/` and are used locally afterward. Veil does not send note contents or vault metadata to Wallhaven.

The built-in Wallhaven browser is SFW-only and does not use or store a Wallhaven API key.

---

<div align="center">

## ☕ Support Veil

If Veil has made your Obsidian workspace more enjoyable, you can support its continued development here.

<a href="https://www.buymeacoffee.com/llocphann">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=llocphann&button_colour=6f5bd3&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00" alt="Buy Me a Coffee" height="48">
</a>

<sub>Your support helps me keep refining Veil, improving wallpaper workflows, routing, visual effects, and documentation.</sub>

</div>

---

## License

[GNU General Public License v3.0](LICENSE)
