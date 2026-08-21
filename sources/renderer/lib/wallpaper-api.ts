// Typed wrappers over the Glaze IPC bridge for Infinite Wallpapers.

import type {
  AppConfig,
  ConfigResult,
  RotationState,
  ThemeCategory,
  ThemeConfig,
  WallpaperRecord,
} from "./wallpaper-types";

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
  updateSettings: (
    patch: Partial<Pick<AppConfig, "frequency" | "matureContent" | "aiAssist" | "minWidth">>,
  ) => ipc().invoke<AppConfig>("settings:update", patch),
  getThemeThumbnail: (presetId: string, query: string, category: ThemeCategory) =>
    ipc().invoke<string | null>("theme:thumbnail", { presetId, query, category }),
  setSerperKey: (key: string) => ipc().invoke<boolean>("serper:setKey", key),
  hasSerperKey: () => ipc().invoke<boolean>("serper:hasKey"),
  next: () => ipc().invoke<WallpaperRecord>("wallpaper:next"),
  skip: () => ipc().invoke<WallpaperRecord>("wallpaper:skip"),
  applyFromHistory: (id: string) => ipc().invoke<WallpaperRecord>("wallpaper:applyFromHistory", id),
  pause: () => ipc().invoke<RotationState>("rotation:pause"),
  resume: () => ipc().invoke<RotationState>("rotation:resume"),
  getRotationState: () => ipc().invoke<RotationState>("rotation:getState"),
  openSettings: () => ipc().invoke<void>("window:openSettings"),
  // The preload bridge types notification params as `unknown`, so narrow here
  // rather than at every call site.
  onConfigChanged: (cb: (next: ConfigResult) => void) =>
    ipc().onNotification("config:changed", (params) => cb(params as ConfigResult)),
  onWallpaperChanged: (cb: () => void) => ipc().onNotification("wallpaper:changed", cb),
  onRotationChanged: (cb: () => void) => ipc().onNotification("rotation:changed", cb),
};

export function isPermissionError(error: unknown): boolean {
  return error instanceof Error && /automation permission/i.test(error.message);
}
