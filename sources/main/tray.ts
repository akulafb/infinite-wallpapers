// Menu-bar (tray) presence for Wallpaper Cycle. Lets the app keep rotating in
// the background with quick controls, even when the main window is closed.

import { app, Tray, Menu, logger } from "@glaze/core/backend";

import { rotationScheduler } from "./services/rotation-scheduler.js";
import { settingsStore } from "./services/settings-store.js";
import { applyNext } from "./services/wallpaper-service.js";

// Stable, app-specific GUID so macOS keeps the menu-bar position across relaunches.
// Generated once; never change it.
const TRAY_GUID = "b7d3f0a2-6c41-4e58-9a2b-1f7c2d9e4a10";

interface TrayCallbacks {
  openMainWindow: () => void;
  openSettings: () => void | Promise<void>;
}

let tray: Tray | null = null;
let callbacks: TrayCallbacks = { openMainWindow: () => {}, openSettings: () => {} };

function buildMenu(): Menu {
  const cfg = settingsStore.get();
  const freqLabel =
    cfg.frequency === "manual" ? "Manual only" : cfg.frequency[0].toUpperCase() + cfg.frequency.slice(1);

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
    { label: "Open Wallpaper Cycle", click: () => callbacks.openMainWindow() },
    { label: "Settings…", click: () => void callbacks.openSettings() },
    { type: "separator" },
    { label: "Quit Wallpaper Cycle", click: () => app.quit() },
  ]);
}

export function createTray(cbs: TrayCallbacks): void {
  callbacks = cbs;
  if (tray && !tray.isDestroyed()) return;
  // SF Symbol rendered as a template glyph so macOS tints it for the menu bar.
  tray = new Tray("photo.on.rectangle.angled", TRAY_GUID);
  tray.setToolTip("Wallpaper Cycle");
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
