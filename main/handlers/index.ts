/**
 * Handler Registration
 *
 * Register all your IPC handlers here
 */

import { ipcMain } from "electron";

import { logger } from "../logger.js";
import { registerWallpaperHandlers } from "./wallpaper.js";
import { getSettingsWindow, openSettingsWindow } from "../windows/settings-window.js";

export function registerHandlers(): void {
  logger.info("handlers", "Registering IPC handlers...");

  // Settings window handlers
  ipcMain.handle("window:openSettings", async (_event) => {
    await openSettingsWindow();
  });

  ipcMain.handle("window:closeSettings", async (_event) => {
    getSettingsWindow()?.close();
  });

  // Infinite Wallpapers handlers (search, download, set wallpaper, rotation, settings)
  registerWallpaperHandlers();

  logger.info("handlers", "✓ IPC handlers registered");
}
