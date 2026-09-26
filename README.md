# Infinite Wallpapers 🌄

A macOS menu-bar app that automatically rotates your desktop wallpaper with high-quality images from the web. Choose a preset theme or describe what you want in plain text.

## Requirements

- **macOS 12 or newer** on an **Apple Silicon** Mac (M1 or later)

## Install

### 1. Download

Go to the [**latest release**](https://github.com/akulafb/infinite-wallpapers/releases/latest) and download the `.dmg` file.

### 2. Install

Open the `.dmg` file and drag **Infinite Wallpapers** into **Applications**.

### 3. Open it the first time

The app is not signed with a paid Apple developer certificate, so macOS blocks it the first time. You only need to do this once:

1. Open **Infinite Wallpapers** from **Applications**. macOS shows a warning. Click **Done** (or **OK**).
2. Open **System Settings** › **Privacy & Security**.
3. Scroll down. Next to the message about **Infinite Wallpapers**, click **Open Anyway**.
4. Confirm with your password or Touch ID, then click **Open Anyway** again.

The app lives in your menu bar (the photo icon at the top of your screen). Closing the window keeps it running there, so your wallpaper keeps changing.

### 4. Grant wallpaper permission

The first time the app changes your desktop picture, macOS will show a prompt asking for permission to control **System Events**. Click **Allow**

*(If you ever miss or dismiss the prompt, open **System Settings** › **Privacy &amp; Security** › **Automation**, find **Infinite Wallpapers**, and turn on **System Events**)*

## Optional Bonus: Access the ENTIRE Web with Serper 🌐

By default, the app searches high-quality wallpapers on [Wallhaven](https://wallhaven.cc) completely free with no setup needed.

To unlock whole-web Google Images search:

1. Sign up for a free account at [serper.dev](https://serper.dev)
2. Copy your API key from the Serper dashboard.
3. In **Infinite Wallpapers**, open **Settings**
4. Paste your key under **Serper API key** and click **Save**

## For developers

### Build from source

You need [**Node.js 22+**](https://nodejs.org). Open the **Terminal** app and run:

```bash
git clone https://github.com/akulafb/infinite-wallpapers.git
cd infinite-wallpapers
npm install
npm start
```

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app with live reload for the UI. The app restarts when backend code changes. |
| `npm start` | Builds and runs the app. |
| `npm run type-check` | Checks TypeScript types. |
| `npm run dist` | Builds the `.dmg` installer into `release/`. |

### Publish a new release

1. Change `version` in `package.json` (for example `1.0.1`) and commit.
2. Tag and push:

   ```bash
   git tag v1.0.1
   git push origin main v1.0.1
   ```

GitHub Actions builds the `.dmg` and adds it to a new release (`.github/workflows/release.yml`).

Project layout:

- `main/`: the Electron main process (search, downloads, scheduling, tray, windows)
- `renderer/`: the React UI for the main and Settings windows, plus the preload bridge
- `renderer/ui/`: small macOS-style UI components (Radix + Tailwind)
- `scripts/`: build and dev scripts (Vite + esbuild)

🌄 *HAPPY WALLPAPERING* 🌄
