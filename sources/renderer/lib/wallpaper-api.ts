// Typed wrappers over the Glaze IPC bridge for Wallpaper Cycle.

import type { AppConfig, ConfigResult, RotationState, ThemeConfig, WallpaperRecord } from "./wallpaper-types";

const ipc = () => window.glazeAPI.glaze.ipc;

// Build a URL the WebView can load for a locally-cached wallpaper file.
export function wallpaperUrl(file: string): string {
  return `wallpaper://img?file=${encodeURIComponent(file)}`;
}

export const wallpaperApi = {
  getConfig: () => ipc().invoke<ConfigResult>("config:get"),
  setPreset: (theme: ThemeConfig) => ipc().invoke<AppConfig>("theme:setPreset", theme),
  setCustom: (description: string) =>
    ipc().invoke<{ config: AppConfig; aiBlocked?: string }>("theme:setCustom", description),
  updateSettings: (patch: Partial<Pick<AppConfig, "frequency" | "matureContent" | "aiAssist" | "minWidth">>) =>
    ipc().invoke<AppConfig>("settings:update", patch),
  setSerperKey: (key: string) => ipc().invoke<boolean>("serper:setKey", key),
  hasSerperKey: () => ipc().invoke<boolean>("serper:hasKey"),
  next: () => ipc().invoke<WallpaperRecord>("wallpaper:next"),
  skip: () => ipc().invoke<WallpaperRecord>("wallpaper:skip"),
  applyFromHistory: (id: string) => ipc().invoke<WallpaperRecord>("wallpaper:applyFromHistory", id),
  pause: () => ipc().invoke<RotationState>("rotation:pause"),
  resume: () => ipc().invoke<RotationState>("rotation:resume"),
  getRotationState: () => ipc().invoke<RotationState>("rotation:getState"),
  openSettings: () => ipc().invoke<void>("window:openSettings"),
  onWallpaperChanged: (cb: () => void) => ipc().onNotification("wallpaper:changed", cb),
  onRotationChanged: (cb: () => void) => ipc().onNotification("rotation:changed", cb),
};

export function isPermissionError(error: unknown): boolean {
  return error instanceof Error && /automation permission/i.test(error.message);
}
