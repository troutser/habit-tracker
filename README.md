# habit widget

A minimal always-on-top desktop habit tracker. Click a habit to mark it done for today. Watch your streak grow.

![screenshot placeholder](screenshot.png)

## features

- Add and remove habits
- Click to mark done for today
- Streak counter (consecutive days)
- Sits in the corner of your screen, always on top
- Dark mode support
- Data saved locally on your machine

## install

Download the latest release for your platform from the [releases page](../../releases).

- **Linux (Ubuntu/Debian):** download the `.deb` file → `sudo dpkg -i habit-widget_*.deb`
- **Linux (universal):** download the `.AppImage` → `chmod +x habit-widget_*.AppImage && ./habit-widget_*.AppImage`
- **Windows:** download the `.msi` installer and run it

## build from source

**Prerequisites:**
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/)
- On Linux: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

```bash
git clone https://github.com/yourusername/habit-widget
cd habit-widget
npm install
npm run tauri dev      # development mode
npm run tauri build    # build for release
```

Built files appear in `src-tauri/target/release/bundle/`.

## data

Your habits are saved to your app data directory:
- **Linux:** `~/.local/share/habit-widget/habits.json`
- **Windows:** `%APPDATA%\habit-widget\habits.json`

## license

MIT
