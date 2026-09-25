import { app, BrowserWindow } from "electron";

import { logger } from "../logger.js";
import { baseWindowOptions } from "./window-options.js";
import { getWindowUrl } from "./window-paths.js";

let settingsWindow: BrowserWindow | null = null;

export async function openSettingsWindow(): Promise<void> {
  // If window exists and is not destroyed, just show it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    logger.debug("settings", "Settings window already exists, showing it");
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  logger.info("settings", "Creating settings window");

  settingsWindow = new BrowserWindow({
    ...baseWindowOptions(),
    width: 560,
    height: 640,
    minWidth: 460,
    minHeight: 520,
    title: "Settings",
    center: true,
  });

  settingsWindow.once("ready-to-show", () => {
    // Menu-bar apps are not frontmost by default; bring the window forward.
    app.focus({ steal: true });
    settingsWindow?.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  const url = getWindowUrl("settings-window.html");
  logger.info("settings", "Loading settings URL", { url });

  await settingsWindow.loadURL(url);
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}
