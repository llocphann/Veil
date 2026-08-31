# Veil

Veil places a vault-local image, animated GIF, or video behind the Obsidian workspace. It keeps the wallpaper separate from interface content, while offering an optional control that fades an entire pane—including nested backgrounds—as one group.

## Features

- Pick media directly from the current vault or enter a vault-relative path.
- Use static images, animated GIFs, MP4, WebM, OGV, M4V, or MOV files.
- Choose fill, fit, center, stretch, or scale-down sizing.
- Adjust wallpaper opacity independently from pane surfaces.
- Optionally fade each pane and all of its descendants as one visual group.
- Add elliptical or circular vignette, blur, and dim effects.
- Apply the wallpaper to the main window and desktop pop-out windows.
- Pause video in hidden windows and respect the operating system's reduced-motion preference.

Veil is desktop-only because reliable video wallpaper playback and multi-window handling depend on Obsidian's desktop runtime.

## Privacy and file access

Veil only reads the wallpaper file selected from the current vault. It does not make network requests, collect telemetry, run analytics, modify media files, or install updates by itself. Wallpaper paths must be vault-relative; URLs and paths outside the vault are rejected.

## Installation

### Community Plugins

After Veil is accepted into the Obsidian Community Plugins directory:

1. Open **Settings → Community plugins → Browse**.
2. Search for **Veil**.
3. Select **Install**, then **Enable**.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the matching GitHub release.
2. Place them in `<vault>/.obsidian/plugins/vault-dashboard-background/`.
3. Reload Obsidian and enable **Veil** under Community plugins.

The internal plugin ID remains `vault-dashboard-background` so existing installations keep their saved settings when upgrading to the TypeScript release.

## Usage

Open **Settings → Community plugins → Veil** and choose a wallpaper file. All visual controls preview immediately. Veil stores only its settings in `data.json`; the selected media remains in its original vault location.

For broad codec support, prefer WebM or MP4 video. Whether a particular MOV, M4V, or OGV file plays depends on the codecs available in the user's Obsidian desktop runtime.

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

[MIT](LICENSE)
