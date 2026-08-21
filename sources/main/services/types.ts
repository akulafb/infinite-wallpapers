// Shared types for the Infinite Wallpapers backend.

export type Frequency = "hourly" | "daily" | "weekly" | "manual";

export type ThemeKind = "preset" | "custom";

// Category hint passed to the search engine (drives Wallhaven category selection).
export type ThemeCategory = "web" | "landscape" | "anime" | "people" | "general";

export interface ThemeConfig {
  id: string; // preset id or "custom"
  label: string; // human label shown in UI / tray
  query: string; // the actual search query sent to providers
  kind: ThemeKind;
  category: ThemeCategory;
}

export interface WallpaperRecord {
  id: string; // uuid, also the file basename stem
  file: string; // basename in the wallpapers dir (e.g. "<uuid>.jpg")
  imageUrl: string; // remote full-resolution URL it was downloaded from
  pageUrl: string; // source page / attribution URL
  provider: string; // "serper" | "wallhaven"
  width: number;
  height: number;
  themeLabel: string;
  appliedAt: number; // epoch ms
}

export interface AppConfig {
  theme: ThemeConfig;
  frequency: Frequency;
  matureContent: boolean;
  aiAssist: boolean;
  minWidth: number; // minimum image width for filtering candidates
  paused: boolean;
  current: WallpaperRecord | null;
  history: WallpaperRecord[]; // most-recent first, capped
  blocked: string[]; // image URLs the user skipped/blocked
  nextRunAt: number | null; // epoch ms of the next scheduled change
}

// A search result candidate before it is downloaded.
export interface Candidate {
  imageUrl: string;
  thumbnailUrl: string;
  pageUrl: string;
  provider: string;
  width: number;
  height: number;
  title: string;
}
