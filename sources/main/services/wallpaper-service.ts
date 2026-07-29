// Orchestrates the full "change the wallpaper" flow: search → pick a fresh
// candidate → download → set as desktop → record in config → broadcast.

import * as path from "path";

import { ipcMain, logger } from "@glaze/core/backend";

import { searchImages } from "./image-search.js";
import { downloadImage, pruneCache } from "./wallpaper-download.js";
import { setWallpaper, WallpaperPermissionError } from "./wallpaper-setter.js";
import { settingsStore, WALLPAPERS_DIR } from "./settings-store.js";
import type { Candidate, WallpaperRecord } from "./types.js";

export class NoImagesError extends Error {
  constructor() {
    super("No suitable wallpapers were found for this theme. Try a different theme or turn on mature content.");
    this.name = "NoImagesError";
  }
}

function pickFresh(candidates: Candidate[], recent: Set<string>): Candidate[] {
  const fresh = candidates.filter((c) => !recent.has(c.imageUrl));
  const pool = fresh.length > 0 ? fresh : candidates;
  // Sample from the most relevant slice for variety without drifting off-theme.
  const top = pool.slice(0, Math.min(20, pool.length));
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  return top;
}

async function search(): Promise<Candidate[]> {
  const cfg = settingsStore.get();
  const candidates = await searchImages({
    query: cfg.theme.query,
    category: cfg.theme.category,
    matureContent: cfg.matureContent,
    minWidth: cfg.minWidth,
    blocked: cfg.blocked,
  });
  return candidates;
}

// Lightweight candidate list for the UI preview strip (no downloads).
export async function previewCandidates(): Promise<Candidate[]> {
  const candidates = await search();
  return candidates.slice(0, 12);
}

// Apply the next wallpaper for the current theme. Tries several candidates in
// case a download fails. Returns the applied record.
export async function applyNext(reason: string): Promise<WallpaperRecord> {
  const cfg = settingsStore.get();
  const candidates = await search();
  if (candidates.length === 0) throw new NoImagesError();

  const recent = new Set(
    [cfg.current?.imageUrl, ...cfg.history.slice(0, 10).map((h) => h.imageUrl)].filter(Boolean) as string[],
  );
  const ordered = pickFresh(candidates, recent);

  let lastError: unknown = null;
  for (const candidate of ordered.slice(0, 6)) {
    try {
      const downloaded = await downloadImage(candidate.imageUrl);
      await setWallpaper(downloaded.absPath);
      const record: WallpaperRecord = {
        id: downloaded.id,
        file: downloaded.file,
        imageUrl: candidate.imageUrl,
        pageUrl: candidate.pageUrl,
        provider: candidate.provider,
        width: candidate.width,
        height: candidate.height,
        themeLabel: cfg.theme.label,
        appliedAt: Date.now(),
      };
      const history = [record, ...cfg.history.filter((h) => h.imageUrl !== record.imageUrl)].slice(0, 30);
      await settingsStore.update({ current: record, history });
      void pruneCache(history.map((h) => h.file));
      logger.info("wallpaper", "Applied new wallpaper", { reason, provider: record.provider });
      ipcMain.broadcast("wallpaper:changed", { record });
      return record;
    } catch (error) {
      if (error instanceof WallpaperPermissionError) throw error; // no point retrying
      lastError = error;
      logger.error("wallpaper", "Candidate failed, trying next", error);
    }
  }
  throw lastError instanceof Error ? lastError : new NoImagesError();
}

// Re-apply a previously downloaded wallpaper from history.
export async function applyFromHistory(id: string): Promise<WallpaperRecord> {
  const cfg = settingsStore.get();
  const record = cfg.history.find((h) => h.id === id);
  if (!record) throw new Error("That wallpaper is no longer available.");
  const absPath = path.join(WALLPAPERS_DIR, record.file);
  await setWallpaper(absPath);
  const updated: WallpaperRecord = { ...record, appliedAt: Date.now() };
  const history = [updated, ...cfg.history.filter((h) => h.id !== id)].slice(0, 30);
  await settingsStore.update({ current: updated, history });
  ipcMain.broadcast("wallpaper:changed", { record: updated });
  return updated;
}

// Block the current image (or a given URL) so it won't be picked again, then rotate.
export async function skipCurrent(): Promise<WallpaperRecord> {
  const cfg = settingsStore.get();
  if (cfg.current) {
    const blocked = [...cfg.blocked, cfg.current.imageUrl];
    await settingsStore.update({ blocked });
  }
  return applyNext("skip");
}
