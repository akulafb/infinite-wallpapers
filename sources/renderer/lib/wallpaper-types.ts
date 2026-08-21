// Shared renderer-side types, mirroring the backend IPC contract
// (main/services/types.ts).

export type Frequency = "hourly" | "daily" | "weekly" | "manual";

export type ThemeCategory = "web" | "landscape" | "anime" | "people" | "general";

export interface ThemeConfig {
  id: string;
  label: string;
  query: string;
  kind: "preset" | "custom";
  category: ThemeCategory;
}

export interface WallpaperRecord {
  id: string;
  file: string;
  imageUrl: string;
  pageUrl: string;
  provider: string;
  width: number;
  height: number;
  themeLabel: string;
  appliedAt: number;
}

export interface AppConfig {
  theme: ThemeConfig;
  frequency: Frequency;
  matureContent: boolean;
  aiAssist: boolean;
  minWidth: number;
  paused: boolean;
  current: WallpaperRecord | null;
  history: WallpaperRecord[];
  blocked: string[];
  nextRunAt: number | null;
}

export interface RotationState {
  paused: boolean;
  frequency: Frequency;
  nextRunAt: number | null;
}

export interface ConfigResult {
  config: AppConfig;
  hasSerperKey: boolean;
}
