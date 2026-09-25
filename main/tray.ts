// Menu-bar (tray) presence for Infinite Wallpapers. Lets the app keep rotating in
// the background with quick controls, even when the main window is closed.

import { app, Menu, nativeImage, Tray } from "electron";

import { logger } from "./logger.js";
import { getAssetPath } from "./windows/window-paths.js";

import { rotationScheduler } from "./services/rotation-scheduler.js";
import { settingsStore } from "./services/settings-store.js";
import { applyNext } from "./services/wallpaper-service.js";

// Stable, app-specific GUID so macOS keeps the menu-bar position across relaunches.
// Generated once; never change it.
const TRAY_GUID = "b7d3f0a2-6c41-4e58-9a2b-1f7c2d9e4a10";

// "Template" images are tinted by macOS to match the menu bar. The @2x file
// next to it is picked up automatically on Retina displays.
function trayIcon(): Electron.NativeImage {
  const image = nativeImage.createFromPath(getAssetPath("trayTemplate.png"));
  image.setTemplateImage(true);
  return image;
}

interface TrayCallbacks {
  openMainWindow: () => void;
  openSettings: () => void | Promise<void>;
}

let tray: Tray | null = null;
let callbacks: TrayCallbacks = { openMainWindow: () => {}, openSettings: () => {} };

function buildMenu(): Menu {
  const cfg = settingsStore.get();
  const freqLabel =
    cfg.frequency === "manual"
      ? "Manual only"
      : cfg.frequency[0].toUpperCase() + cfg.frequency.slice(1);

  return Menu.buildFromTemplate([
    { label: `Theme: ${cfg.theme.label}`, enabled: false },
    { label: cfg.paused ? "Rotation paused" : `Changes: ${freqLabel}`, enabled: false },
    { type: "separator" },
    {
      label: "Next Wallpaper",
      click: async () => {
        try {
          await applyNext("tray");
          await rotationScheduler.reschedule();
        } catch (error) {
          logger.error("tray", "Next wallpaper failed", error);
        }
        refreshTray();
      },
    },
    cfg.paused
      ? {
          label: "Resume Rotation",
          click: async () => {
            await settingsStore.update({ paused: false });
            await rotationScheduler.reschedule();
            refreshTray();
          },
        }
      : {
          label: "Pause Rotation",
          click: async () => {
            await settingsStore.update({ paused: true });
            await rotationScheduler.reschedule();
            refreshTray();
          },
        },
    { type: "separator" },
    { label: "Open Infinite Wallpapers", click: () => callbacks.openMainWindow() },
    { label: "Settings…", click: () => void callbacks.openSettings() },
    { type: "separator" },
    { label: "Quit Infinite Wallpapers", click: () => app.quit() },
  ]);
}

export function createTray(cbs: TrayCallbacks): void {
  callbacks = cbs;
  if (tray && !tray.isDestroyed()) return;
  tray = new Tray(trayIcon(), TRAY_GUID);
  tray.setToolTip("Infinite Wallpapers");
  tray.setContextMenu(buildMenu());
  app.on("before-quit", () => {
    tray?.destroy();
    tray = null;
  });
  logger.info("tray", "Tray created");
}

// Rebuild the menu to reflect theme / rotation-state changes.
export function refreshTray(): void {
  if (tray && !tray.isDestroyed()) tray.setContextMenu(buildMenu());
}
