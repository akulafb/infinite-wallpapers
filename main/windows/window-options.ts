import type { BrowserWindowConstructorOptions } from "electron";

import { getPreloadPath } from "./window-paths.js";

// Shared macOS look: translucent sidebar-style material with the traffic
// lights inset into the content (the renderer draws its own drag region).
export function baseWindowOptions(): BrowserWindowConstructorOptions {
  return {
    show: false,
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  };
}
