# Infinite Wallpapers 🌄

A macOS menu-bar app that automatically rotates your desktop wallpaper with high-quality images from the web. Choose a preset theme or describe what you want in plain text.

## Requirements

- **macOS 12 or newer**
- [**Node.js 22+**](https://nodejs.org) (only to build from source)

## Step-by-Step Setup

### 1. Get the code

Open the **Terminal** app on your Mac and run:

```bash
git clone https://github.com/akulafb/infinite-wallpapers.git
cd infinite-wallpapers
npm install
```

### 2. Run the app

```bash
npm start
```

The app lives in your menu bar (the photo icon at the top of your screen). Closing the window keeps it running there, so your wallpaper keeps changing.

### 3. (Optional) Install it like a normal Mac app

```bash
npm run dist
```

This creates `release/Infinite Wallpapers-1.0.0-universal.dmg`. Open it and drag the app into **Applications**.

The app is not signed with an Apple developer certificate, so the first time you open it macOS will block it. Right-click the app in **Applications**, choose **Open**, then click **Open** again. (On newer macOS versions: **System Settings** › **Privacy & Security** › **Open Anyway**.)

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

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app with live reload for the UI. The app restarts when backend code changes. |
| `npm start` | Builds and runs the app. |
| `npm run type-check` | Checks TypeScript types. |
| `npm run dist` | Builds the `.dmg` installer into `release/`. |

Project layout:

- `main/`: the Electron main process (search, downloads, scheduling, tray, windows)
- `renderer/`: the React UI for the main and Settings windows, plus the preload bridge
- `renderer/ui/`: small macOS-style UI components (Radix + Tailwind)
- `scripts/`: build and dev scripts (Vite + esbuild)

🌄 *HAPPY WALLPAPERING* 🌄
