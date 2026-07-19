# TokaZerk UI Picker

A small desktop app that swaps the optional assets of the TokaZerk DAoC UI:

- **Options variants** – everything under `Options/` is discovered automatically:
  - Subfolders with variant folders (e.g. `Options/TargetWindow/purple`) become a choice.
  - Subfolders with loose files (e.g. `Options/HUD`) become a one-click apply. Before the
    first apply, the current files are backed up to `Options/<Category>/_original/` and
    offered as an **Original** variant, so everything can be reverted.
- **Map Size** – copies `Maps_large` or `Maps_small` over `Maps`.
- **Frontier War Maps** – copies the `NF` or `OF` realm war XMLs into the UI root.

The currently active variant is detected by file comparison and marked with a checkmark.

## Previews

Each variant shows a thumbnail (click it to enlarge). The picker resolves a preview
in this order:

1. **Author-provided image** – a file named `preview.*`, `screenshot.*` or `thumb.*`
   (`.png/.jpg/.gif/.webp`) placed in the variant folder is used as-is. This is the way
   to give the XML-only window skins a real screenshot.
2. **Shipped raster asset** – any image the variant contains is decoded and shown. TGA
   (RLE + uncompressed) and DDS (DXT1/3/5 + uncompressed RGB) are decoded in pure JS, so
   the HUD atlas and map tiles get previews automatically.
3. **Status-bar fill colour** – for target/status-bar window skins with no image, the
   picker follows the `StatusBarTemplate → HorizontalResizeImageTemplate → Texture`
   chain in `styles.xml` / `TokaZerkStyles.xml` / `assets.xml` and samples the bar's
   fill pixel, so e.g. the blue vs. purple target window show their actual colours.

If none of these resolve, the card shows a *No preview* placeholder — drop in a
`preview.png` to fix that.

## Usage

Put the executable anywhere (next to the `custom` folder or inside it is most convenient)
and start it:

- **Linux**: `TokaZerkUI-Picker-<version>.AppImage` (make it executable: `chmod +x`)
- **Windows**: `TokaZerkUI-Picker-<version>.exe` (portable, no installation)

If the picker does not find the UI folder automatically, select your
`Dark Age of Camelot/ui/custom` folder via *Change folder…* (remembered for next time).

Changes take effect after the game reloads the UI (relog or `/quit` to character select).

## Development

Requires Node.js 22+.

```bash
cd picker
npm install
npm test            # core logic tests
npm start           # run the app
npm run dist:linux  # build the AppImage (on Linux)
npm run dist:win    # build the portable exe (on Windows)
```

Release builds for both platforms are produced by the `Picker` GitHub workflow and
attached to tagged releases.
