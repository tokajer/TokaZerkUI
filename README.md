# TokaZerk DAoC User Interface
[![License](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)  
[![Last Commit](https://img.shields.io/github/last-commit/tokajer/TokaZerkUI)](https://github.com/tokajer/TokaZerkUI/commits/main)  
[![GitHub Stars](https://img.shields.io/github/stars/tokajer/TokaZerkUI)](https://github.com/tokajer/TokaZerkUI/stargazers)  
[![GitHub Forks](https://img.shields.io/github/forks/tokajer/TokaZerkUI)](https://github.com/tokajer/TokaZerkUI/network/members)  
![GitHub all releases](https://img.shields.io/github/downloads/tokajer/TokaZerkUI/total?cacheSeconds=60)

![UI Preview](https://i.imgur.com/dufN7RN.png)

---

## Table of Contents

- [About the Project](#about-the-project)
- [Getting Started](#getting-started)
  - [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Asset Picker](#asset-picker)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

---

## About the Project

Welcome, adventurers, to a reimagined experience in the realms of Albion, Midgard, and Hibernia.  
**TokaZerk UI** is a custom user interface for **Dark Age of Camelot**, based on GhostUI and countless other elements, specifically tailored for the **Eden freeshard** server.

Crafted by **Tokajer** and **Zerker**, this UI combines modern readability and sleek performance with the classic DAoC vibe. Whether you're a fresh recruit or a long-time realm defender, this UI will enhance your battlefield awareness and provide a cleaner, more immersive experience.

---

## Features

- 🗺️ **Switchable Map Sizes** – Choose between **large** or **small** map layouts for optimal battlefield visibility.
- 🔤 **Font-Based Text Rendering** – Unlike most UIs that use sprite-based graphics for text, TokaZerk uses true fonts for clearer, crisper readability.
- 🎛️ **Asset Picker** – A small desktop app (Windows & Linux) that previews and swaps the optional assets — target window styles, HUD, map size, old/new frontier war maps — with a single click. See [Asset Picker](#asset-picker).
- 🎨 Clean, streamlined visuals that stay true to the classic DAoC aesthetic.
- 🔧 Built with flexibility and customization in mind.

---

## Getting Started

### Installation

1. Download and unzip the UI package.
2. Copy the entire `custom` folder to your DAoC UI directory. This is typically located at:


3. Launch DAoC and, on the **character selection screen**, go to:  
`Options > Interface > Custom Skin`  
Then select the custom UI.

---

## Usage

Once installed, jump into the game and enjoy the enhanced UI!

The easiest way to customize the UI is the [Asset Picker](#asset-picker) — it previews and swaps all optional assets for you. If you prefer to do it by hand, you can switch between **large** and **small** map styles by deleting the old `Maps` folder and renaming folders inside the `custom` directory:

- To use **large maps**, rename the folder `Maps_large` to `Maps`
- To use **small maps**, rename the folder `Maps_small` to `Maps`

---

## Asset Picker

The **TokaZerk UI Picker** is a small desktop app that swaps the optional assets of the UI for you — no more renaming folders by hand. It automatically finds the switchable assets, shows a preview of each one and marks the variant that is currently active.

**What you can switch**

- 🎯 **Target Window** – e.g. the blue or purple target status bar
- 📟 **HUD** and floating windows
- 🗺️ **Map Size** – large or small
- ⚔️ **Frontier War Maps** – New Frontiers (NF) or Old Frontiers (OF)

**How to use it**

1. Grab the picker from the [releases page](https://github.com/tokajer/TokaZerkUI/releases):
   - **Windows** – `TokaZerkUI-Picker-<version>.exe` (portable, no installation)
   - **Linux** – `TokaZerkUI-Picker-<version>.AppImage` (`chmod +x` to make it executable)
2. Put it into (or next to) your `Dark Age of Camelot/ui/custom` folder and start it. If it doesn't find the folder automatically, pick it via *Change folder…*.
3. Click a variant to apply it. Changes take effect after the game reloads the UI (relog or `/quit` to character select).

The first time a variant is applied, the files it replaces are backed up so you can always switch back to the **Original**. See [picker/README.md](picker/README.md) for details and build instructions.

---

## Contributing

Suggestions and improvements are welcome!  
Feel free to open issues or pull requests on the [GitHub repository](https://github.com/tokajer/tokazerk-daoc-ui).

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

---

## Contact

Created by:
- [Tokajer](https://github.com/tokajer)
- [Zerker](https://github.com/zerker)

For support or questions, open an issue on GitHub.

---

## Acknowledgements

- This UI is largely based on GhostUI and countless other UIs before it.
- Thanks to the Eden freeshard team for an incredible server.
