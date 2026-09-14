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

## Release baseline

### 1.6.0 — Optimization and stability release — released

Veil 1.6.0 is the current optimization baseline after 1.5.3. It preserves the existing feature set while reducing redundant workspace refreshes, media reloads, DOM mutation, routing work, pool invalidation, and idle GPU/CPU activity.

The release is guarded by six stability invariants:

1. A no-op context refresh performs no meaningful work.
2. Appearance-only changes never reload unchanged media.
3. A context change invalidates only affected windows and documents.
4. Vault changes invalidate only relevant media and wallpaper-pool caches.
5. Idle operation has no unnecessary recurring timers, animation, DOM mutation, or vault scanning.
6. Every persisted-data version has a deterministic migration path.

Performance regressions can be checked locally with one command:

```bash
npm run perf
```

The command runs deterministic performance contracts, verifies a production build, compares optimization behavior against the current `stable` baseline, checks bundle growth, and reports Settings-path microbenchmarks.

## 1.7 — Runtime hot-path efficiency — in progress on `dev`

Veil 1.7 continues the optimization-first direction without removing, simplifying, or changing existing user-facing features and functions. The goal is to reduce CPU work that still occurs inside already-scoped updates, especially during continuous Settings interaction, repeated context resolution, large Scene/rule configurations, and multi-window use.

Every optimization must preserve the 1.6 stability contract and must be measurable through deterministic work-count regression tests or repeatable benchmark evidence. Timing-only changes that cannot be distinguished from machine noise are not sufficient by themselves.

### Phase 1 — Cheap no-op and UI mutation fast paths

- Make status updates idempotent so unchanged message/tone pairs do not refresh Settings UI.
- Audit remaining class, dataset, style, and status writes for safe equality guards.
- Keep these fast paths allocation-light and free of new timers or caches.
- Extend profiler/test coverage so skipped work is observable in development builds.

### Phase 2 — Patch-aware Settings change detection

- Remove whole-object `JSON.stringify()` equality work from the normal Settings update hot path.
- Compare scalar values directly and deep-compare only collections that a patch can actually affect.
- Reuse one change-analysis pass instead of serializing the same profiles, rules, exclusions, and appearance state multiple times.
- Preserve normalization, persistence, migration, recent-wallpaper tracking, routing schedule semantics, and pool reconciliation exactly.
- Expand the Settings microbenchmark for small, medium, large, and stress-size configurations.

### Phase 3 — Frame-coalesced continuous controls

- Coalesce high-frequency slider/input changes so expensive runtime application happens at most once per animation frame.
- Always preserve the latest input value and final persisted value; no intermediate user-visible state may be lost.
- Keep control feedback visually immediate while separating cheap local UI updates from expensive document resolution/application work where safe.
- Verify mouse, keyboard, and programmatic control updates retain existing semantics.

### Phase 4 — Live workspace document registry

- Maintain one authoritative set of active workspace documents instead of repeatedly reconstructing it through `iterateAllLeaves()` in multiple subsystems.
- Update the registry through initial discovery, layout repair, pop-out open, and pop-out close events.
- Reuse the registry for workspace apply, file-to-document lookup, pool targeting, vault-path invalidation, and layout invalidation.
- Preserve root-leaf fallback discovery and multi-window correctness when Obsidian changes ownership unexpectedly.

### Phase 5 — Document context caching

- Cache resolved note context per document when file identity, metadata, and theme are unchanged.
- Avoid repeated active-leaf lookup, metadata-cache access, tag extraction, and frontmatter object reconstruction on no-op document applies.
- Invalidate context explicitly on file changes, metadata changes, layout/root ownership changes, theme dependency changes, and document close.
- Ensure cached contexts never survive an invalidation boundary that can change Routing or opacity-exclusion output.

### Phase 6 — Scene and routing resolution caching

- Cache Scene/rule resolution behind explicit Settings, context, and manual-Scene revisions.
- Reuse unchanged resolution for pool targeting, Settings invalidation, vault-path checks, status summaries, and document application.
- Keep manual Scene changes deterministic and avoid cache state that mutates during side-effect-free snapshot comparisons.
- Preserve all Routing precedence, legacy inline-rule fallback, and opacity-exclusion behavior.

### Phase 7 — Source-resolution and media lookup caching

- Cache vault source lookup data when resolved path, file stat, and explicit source revision are unchanged.
- Avoid repeated path validation, `getAbstractFileByPath()`, media-kind detection, resource URL generation, and media-key assembly for an unchanged source.
- Keep media identity separate from appearance, Scene/routing identity, and playback identity so visual changes still never force media reloads.
- Invalidate source lookup only for relevant vault events, pool selection changes, resolved-path changes, or explicit Reload.

### Phase 8 — Measurement and release gate

- Extend the development-only work profiler with counters for context builds, Scene/rule resolution, source resolution, Settings comparison, and skipped no-op work where useful.
- Extend `npm run perf` so 1.7 compares against the released 1.6.0 baseline and fails on structural performance regressions.
- Keep production profiler/debug markers fully stripped from `main.js`.
- Track production bundle growth separately from runtime efficiency; smaller hot-path work must not justify uncontrolled bundle expansion.
- Add an optional live-Obsidian benchmark harness only where Electron/DOM/media timing is necessary to validate behavior that deterministic tests cannot measure.

### 1.7 acceptance criteria

1. All 1.6 stability-contract tests remain green without weakening assertions.
2. No existing Scene, Routing, Wallpaper Library, pool, appearance, video, transition, persistence, import/export, command, or multi-window behavior is removed or intentionally changed.
3. `npm run perf` passes against the released 1.6.0 baseline.
4. Settings-path work scales better for large profile/rule collections and does not add a new full-settings serialization pass.
5. Continuous Settings controls perform no more than one expensive runtime apply per animation frame where batching is applicable.
6. Repeated document applies with unchanged file metadata/theme reuse cached context and resolution instead of rebuilding equivalent state.
7. Idle Veil continues to perform no unnecessary recurring work.
8. Any new cache has an explicit invalidation contract and regression tests proving stale state cannot escape it.

### 1.7 non-goals

The 1.7 cycle remains performance-focused. New wallpaper providers, cloud services, image editing, scripting, shader-heavy effects, Scene nesting, a substantially more complex Routing DSL, and other feature-expansion work remain outside scope unless required to preserve an existing feature while optimizing it.

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
