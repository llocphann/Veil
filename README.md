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

## Roadmap to 2.0

Veil 2.0 is planned as a refinement release rather than a feature-expansion release. The current feature set already covers the main wallpaper workflow, so development from 1.6 onward will prioritize lower runtime cost, cleaner internal boundaries, deterministic state handling, and stronger regression guarantees.

### 1.6 — Architecture decomposition

- Reduce the amount of orchestration and state ownership concentrated in `main.ts`.
- Split settings and Wallpaper Library responsibilities into smaller, independently testable modules.
- Preserve existing behavior while clarifying ownership between context resolution, wallpaper pools, media lifecycle, document application, and persistence.
- Avoid user-facing feature additions unless they are required to complete the refactor safely.

### 1.7 — Runtime invalidation and no-op fast paths

- Replace broad refresh work with explicit invalidation for context, source, appearance, playback, layout, and pool state.
- Add stable runtime signatures so unchanged context or appearance produces no DOM or media work.
- Restrict multi-window updates to the documents whose resolved state actually changed.
- Continue reducing metadata-cache and vault-event work on hot paths.

### 1.8 — Media lifecycle and transition efficiency

- Formalize media states from resolution and load through transition, active playback, and disposal.
- Keep media identity separate from appearance and playback identity so visual changes do not reload unchanged images or videos.
- Audit image, GIF, and video allocation, playback, cleanup, and stale-load behavior.
- Ensure unchanged video sources do not restart when only visual settings change.

### 1.9 — State, UI efficiency, and release hardening

- Version the persisted settings schema and use explicit, deterministic migrations.
- Reduce unnecessary Settings and Wallpaper Library rerenders and DOM churn.
- Add regression tests that measure unnecessary work, not only functional output.
- Add development-only performance instrumentation without telemetry or analytics.
- Audit CSS effects and compositing so an idle Veil remains effectively idle.

### 2.0 — Stability contract

Veil 2.0 should preserve the product direction established in 1.x while making the runtime easier to reason about and cheaper to keep enabled. The release target is defined by these invariants:

1. A no-op context refresh performs no meaningful work.
2. Appearance-only changes never reload unchanged media.
3. A context change invalidates only affected windows and documents.
4. Vault changes invalidate only relevant media and wallpaper-pool caches.
5. Idle operation has no unnecessary recurring timers, animation, DOM mutation, or vault scanning.
6. Every persisted-data version has a deterministic migration path.

Features such as additional wallpaper providers, cloud services, image editing, scripting, shader-heavy effects, Scene nesting, or a substantially more complex routing DSL are intentionally outside this roadmap unless they become necessary for the core wallpaper experience.

### Development branches

- `dev` is the integration branch for work moving toward the next release and must pass the full verification workflow.
- `stable` contains release-ready source. Promotion to `stable` triggers the stable release pipeline, which verifies the source again, increments the patch version, synchronizes release metadata, tags the verified commit, and publishes the release artifacts.
- `main` and `prerelease` remain available for compatibility with the existing repository history while the `dev` → `stable` flow is adopted.

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
