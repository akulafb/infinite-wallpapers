// Typed wrappers over the preload IPC bridge for Infinite Wallpapers.

import type {
  AppConfig,
  ConfigResult,
  RotationState,
  ThemeSource,
  ThemeCategory,
  ThemeConfig,
  WallpaperRecord,
} from "./wallpaper-types";

const ipc = () => window.api;

// Build a URL the WebView can load for a locally-cached wallpaper file.
export function wallpaperUrl(file: string): string {
  return `wallpaper://img?file=${encodeURIComponent(file)}`;
}

export const wallpaperApi = {
  getConfig: () => ipc().invoke<ConfigResult>("config:get"),
  setPreset: (theme: ThemeConfig) => ipc().invoke<AppConfig>("theme:setPreset", theme),
  setCustom: (description: string) => ipc().invoke<AppConfig>("theme:setCustom", description),
  updateSettings: (
    patch: Partial<Pick<AppConfig, "frequency" | "matureContent" | "minWidth">>,
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
  setAppearance: (source: ThemeSource) => ipc().invoke<AppConfig>("appearance:set", source),
  checkAutomation: () => ipc().invoke<boolean>("permissions:checkAutomation"),
  openSettings: () => ipc().invoke<void>("window:openSettings"),
  closeSettings: () => ipc().invoke<void>("window:closeSettings"),
  // The preload bridge types event payloads as `unknown`, so narrow here
  // rather than at every call site.
  onConfigChanged: (cb: (next: ConfigResult) => void) =>
    ipc().on("config:changed", (payload) => cb(payload as ConfigResult)),
  onWallpaperChanged: (cb: () => void) => ipc().on("wallpaper:changed", cb),
  onRotationChanged: (cb: () => void) => ipc().on("rotation:changed", cb),
};

export function cleanErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong applying the wallpaper.";
  const stripped = error.message
    .replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/i, "")
    .trim();
  return stripped || "Something went wrong applying the wallpaper.";
}

export function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /automation permission|-1743|1743|System Events/i.test(error.message);
}
