// Main process entry point for Infinite Wallpapers.

import * as path from "path";
import { pathToFileURL } from "url";

import { app, BrowserWindow, Menu, nativeTheme, net, protocol } from "electron";

import { logger } from "./logger.js";
import { registerHandlers } from "./handlers/index.js";
import { baseWindowOptions } from "./windows/window-options.js";
import { getWindowUrl } from "./windows/window-paths.js";
import { openSettingsWindow } from "./windows/settings-window.js";
import { createTray } from "./tray.js";
import { rotationScheduler } from "./services/rotation-scheduler.js";
import { settingsStore, WALLPAPERS_DIR } from "./services/settings-store.js";

// Only one copy of the app should rotate wallpapers at a time.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// ── Local wallpaper protocol ──────────────────────────────────────────
// Serve downloaded wallpaper files to the renderer via wallpaper://img?file=<name>.
// The scheme must be registered as privileged before the app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "wallpaper",
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function registerWallpaperProtocol(): void {
  protocol.handle("wallpaper", (request) => {
    const file = new URL(request.url).searchParams.get("file");
    if (!file) return new Response("Missing file", { status: 400 });
    // Only serve files that resolve inside the wallpapers cache directory.
    const absPath = path.resolve(WALLPAPERS_DIR, file);
    if (path.dirname(absPath) !== path.resolve(WALLPAPERS_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }
    return net.fetch(pathToFileURL(absPath).toString());
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────
registerHandlers();

// ── State ─────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

// ── Window creation ───────────────────────────────────────────────────
async function createMainWindow(): Promise<void> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    logger.debug("main", "Main window already exists, skipping creation");
    return;
  }

  mainWindow = new BrowserWindow({
    ...baseWindowOptions(),
    width: 780,
    height: 760,
    minWidth: 480,
    minHeight: 560,
    title: "Infinite Wallpapers",
  });

  // Don't show until the page is ready (prevents a blank flash).
  mainWindow.once("ready-to-show", () => {
    // Menu-bar apps are not frontmost by default; bring the window forward.
    app.focus({ steal: true });
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const url = getWindowUrl("main-window.html");
  logger.info("main", "Loading main window", { url });
  await mainWindow.loadURL(url);
}

// Show the main window, creating it if it was closed (menu-bar app has no dock).
function showMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    app.focus({ steal: true });
    mainWindow.show();
    mainWindow.focus();
  } else {
    void createMainWindow();
  }
}

// ── Application menu ──────────────────────────────────────────────────
function setupApplicationMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Settings…",
          accelerator: "Command+,",
          click: () => void openSettingsWindow(),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ]);
  Menu.setApplicationMenu(menu);
}

// ── Lifecycle events ──────────────────────────────────────────────────
app.on("window-all-closed", () => {
  // Keep running in the menu bar so rotation continues after windows close.
});

app.on("second-instance", () => showMainWindow());

app.on("activate", (_event, hasVisibleWindows) => {
  if (!hasVisibleWindows) showMainWindow();
});

// ── App ready ─────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Menu-bar app: no Dock icon (the packaged app also sets LSUIElement).
  app.dock?.hide();

  registerWallpaperProtocol();
  setupApplicationMenu();

  // Load persisted settings, start the rotation scheduler, and add the menu-bar tray.
  const config = await settingsStore.load();
  nativeTheme.themeSource = config.themeSource;
  await settingsStore.reconcileHistory();
  await rotationScheduler.start();
  createTray({
    openMainWindow: showMainWindow,
    openSettings: () => openSettingsWindow(),
  });

  createMainWindow().catch((error) => {
    logger.error("main", "Failed to create main window", error);
  });
});
