# habit widget

A lightweight, always-on-top desktop habit tracker built with Tauri and React. Sits in the corner of your screen, tracks your streaks, and stays out of the way.

## features

- **Habit tracking** — click a habit to mark it done for today, click again to unmark
- **Streak counter** — shows how many consecutive days you've completed each habit
- **Per-habit images** — assign a custom image to each habit as its icon
- **Fully customizable** — font, font size, background color, background image, text color, accent color, opacity, corner radius
- **Animations** — choose from pop, slide, bounce, or none when checking off a habit
- **Sound effects** — subtle audio feedback when marking habits done (adjustable volume)
- **Pin / unpin** — toggle always-on-top; unpinned window is freely draggable
- **Resizable** — drag any edge or corner to resize
- **Persistent** — all habits, streaks, and settings are saved locally and restored on launch
- **Transparent background** — sits naturally on your desktop

## install

Download the latest release for your platform from the [releases page](../../releases).

| Platform | File |
|----------|------|
| Linux (Ubuntu/Debian) | `.deb` |
| Linux (universal) | `.AppImage` |
| Windows | `.msi` |

**Linux AppImage:**
```bash
chmod +x habit-widget_*.AppImage
./habit-widget_*.AppImage
```

**Linux .deb:**
```bash
sudo dpkg -i habit-widget_*.deb
```

## usage

| Action | How |
|--------|-----|
| Mark habit done | Click the habit |
| Add a habit | Click `+` in the top right |
| Delete a habit | Hover a habit, click the `×` that appears |
| Customize appearance | Click `&` (settings) |
| Pin / unpin window | Click `*` (pin button) |
| Move window | Unpin first, then drag |
| Resize window | Drag any edge or corner |

## build from source

**Prerequisites:**
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- Linux system dependencies:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev
  ```

**Run in development:**
```bash
git clone https://github.com/yourusername/habit-widget
cd habit-widget
npm install
npm run tauri dev
```

**Build for release:**
```bash
npm run tauri build
```

Built files appear in `src-tauri/target/release/bundle/`.

## data

Your habits and settings are saved to:

| Platform | Location |
|----------|----------|
| Linux | `~/.local/share/habit-widget/habits.json` |
| Windows | `%APPDATA%\habit-widget\habits.json` |

## tech stack

- [Tauri v2](https://tauri.app/) — desktop shell
- [React 18](https://react.dev/) — UI
- [Vite](https://vitejs.dev/) — build tool
- Web Audio API — sound effects

## license

MIT
