# Infinite Wallpapers 🌄

A macOS menu-bar app that automatically rotates your desktop wallpaper with high-quality images from the web. Choose a preset theme or describe what you want in plain text.

## Requirements

- **macOS 14 or newer**
- [**Glaze**](https://glaze.dev) installed on your Mac

## Step-by-Step Setup

### 1. Navigate to your Glaze folder and clone the project there

Open the **Terminal** app on your Mac and run:

```bash
cd ~/Glaze
git clone https://github.com/akulafb/infinite-wallpapers.git "Infinite Wallpapers"
```

### 2. Open and run the app

**Option A: Using the Glaze app (easiest)**

1. Open **Glaze**
2. Select **Infinite Wallpapers** from your project list
3. Click **Run**

**Option B: Using Terminal (also easy)**

```bash
cd ~/Glaze/"Infinite Wallpapers"/sources
npm run verify
npm run launch
```

### 3. Grant wallpaper permission

The first time the app changes your desktop picture, macOS will show a prompt asking for permission to control **System Events**. Click **Allow**

*(If you ever miss or dismiss the prompt, open **System Settings** › **Privacy &amp; Security** › **Automation**, find **Infinite Wallpapers**, and turn on **System Events**)*

## Optional Bonus: Access the ENTIRE Web with Serper 🌐

By default, the app searches high-quality wallpapers on [Wallhaven](https://wallhaven.cc) completely free with no setup needed.

To unlock whole-web Google Images search:

1. Sign up for a free account at [serper.dev](https://serper.dev) 
2. Copy your API key from the Serper dashboard.
3. In **Infinite Wallpapers**, open **Settings** 
4. Paste your key under **Serper API key** and click **Save**



🌄 *HAPPY WALLPAPERING* 🌄