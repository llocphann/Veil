# Veil

Veil places a vault-local image, animated GIF, or video behind the Obsidian workspace. It keeps the wallpaper separate from interface content, while offering an optional control that fades an entire pane—including nested backgrounds—as one group.

<p align="center">
  <img src="assets/homepage.png" alt="Ledge Dock in my Obsidian theme" width="82%">
</p>

<p align="center">
  <sub>The city background in my theme</sub>
</p>

## Features

- Pick media directly from the current vault or enter a vault-relative path.
- Route different wallpapers to a note name, exact path, folder, or tag; the first matching rule wins.
- Exclude selected notes, paths, folders, or tags from pane-surface and whole-pane opacity.
- Use static images, animated GIFs, MP4, WebM, OGV, M4V, or MOV files.
- Choose fill, fit, center, stretch, or scale-down sizing.
- Adjust wallpaper opacity independently from pane surfaces.
- Optionally fade each pane and all of its descendants as one visual group.
- Recolor the active wallpaper with an adjustable color overlay and blend mode.
- Add elliptical or circular vignette, blur, dim, retro film, glitch, or TV-noise effects.
- Export and import a validated, versioned JSON backup of every Veil setting and rule.
- Navigate compact tabbed settings for wallpaper, rules, effects, video, actions, and support.
- Apply the wallpaper to the main window and desktop pop-out windows.
- Pause video in hidden windows and respect the operating system's reduced-motion preference.

Veil is desktop-only because reliable video wallpaper playback and multi-window handling depend on Obsidian's desktop runtime.

## Privacy and file access

Veil reads the selected wallpaper files and Obsidian's already-indexed path and tag metadata for the active file. It does not make network requests, collect telemetry, run analytics, modify media files, or install updates by itself. Wallpaper paths must be vault-relative; URLs and paths outside the vault are rejected.

## Installation

### Community Plugins

After Veil is accepted into the Obsidian Community Plugins directory:

1. Open **Settings → Community plugins → Browse**.
2. Search for **Veil**.
3. Select **Install**, then **Enable**.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the matching GitHub release.
2. Place them in `<vault>/.obsidian/plugins/veil/`.
3. Reload Obsidian and enable **Veil** under Community plugins.

The plugin ID is `veil`, which is also the name of its folder inside `.obsidian/plugins`.

## Usage

Open **Settings → Community plugins → Veil**, choose the **Wallpaper** tab, and select the fallback wallpaper. Use **Rules** to add ordered wallpaper routes and opacity exclusions.

Rules can match:

- **Note name** without requiring the `.md` extension;
- **Exact path** to one vault file;
- **Folder** and every descendant file;
- **Tag**, including nested tags such as `#media/movie` when matching `#media`.

Wallpaper routes are evaluated from top to bottom, and the first enabled match replaces the fallback wallpaper. Opacity exclusions are additive: a matching rule can keep pane surfaces, pane content, or both at 100% opacity. All visual controls preview immediately. Veil stores only its settings in `data.json`; selected media remains in its original vault location.

Use **Actions → Export settings** to download a portable JSON backup. Import replaces the current configuration after Veil verifies the file type and schema, normalizes every value, repairs duplicate rule IDs, and enforces rule-count and file-size limits. Wallpaper media files are referenced by vault-relative path and are not embedded in the export.

For broad codec support, prefer WebM or MP4 video. Whether a particular MOV, M4V, or OGV file plays depends on the codecs available in the user's Obsidian desktop runtime.

## Performance and stability

Veil is event-driven: it does not poll the vault, and repeated workspace refreshes are coalesced into one animation frame. Video pauses in hidden windows, and imported settings cannot inject arbitrary CSS colors or point the wallpaper outside the vault.

Effect cost depends on the media size, window resolution, and graphics hardware:

| Feature | Typical cost | Notes |
| --- | --- | --- |
| Opacity, dim, color overlay, vignette | Low | Primarily composited by the GPU. Non-normal overlay blend modes add a small compositing cost. |
| Retro film | Low–moderate | Uses a static media filter and scanline layer. |
| Blur | Moderate–high GPU | Cost rises with blur radius, wallpaper resolution, and the number of open windows. |
| Video or animated GIF | Moderate CPU/GPU | Video decoding depends on codec and resolution. GIF animation cannot be paused by Veil. |
| Glitch and TV noise | High GPU | These presets animate continuously. Reduced-motion mode freezes their animation. |
| Video + strong blur + animated preset | Highest | This combination may stutter on integrated graphics or battery-powered devices. |

For the lightest setup, use a static image, keep blur low or off, and avoid animated presets. If animation is needed, keep **Pause video when the app is hidden** and **Respect reduced motion** enabled.

## Support

If Veil is useful to you, you can support its continued development:

[![Buy me a coffee](https://raw.githubusercontent.com/llocphann/Veil/main/assets/buy-me-a-coffee.svg)](https://www.buymeacoffee.com/llocphann)

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Run the complete verification suite before publishing:

```bash
npm run check
```

The production build writes `main.js` at the repository root. `main.js` is intentionally excluded from source control and attached to tagged GitHub releases instead.

## Releasing

1. Update the version in `package.json`.
2. Run `npm version patch`, `npm version minor`, or `npm version major` as appropriate.
3. Push the commit and its version tag.
4. The release workflow verifies the tag, runs all checks, attests the release files, and creates a draft GitHub release containing `main.js`, `manifest.json`, and `styles.css`.
5. Review and publish the draft release.

The Git tag must exactly match the version in `manifest.json`.

## License

[GNU General Public License v3.0](LICENSE)
