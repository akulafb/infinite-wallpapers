// Orchestrates the full "change the wallpaper" flow: search → pick a fresh
// candidate → download → set as desktop → record in config → broadcast.

import * as path from "path";

import { broadcast } from "../broadcast.js";
import { logger } from "../logger.js";

import { searchImages } from "./image-search.js";
import { downloadImage, pruneCache } from "./wallpaper-download.js";
import { setWallpaper, WallpaperPermissionError } from "./wallpaper-setter.js";
import { settingsStore, WALLPAPERS_DIR } from "./settings-store.js";
import type { Candidate, WallpaperRecord } from "./types.js";

export class NoImagesError extends Error {
  constructor() {
    super(
      "No suitable wallpapers were found for this theme. Try a different theme or turn on mature content.",
    );
    this.name = "NoImagesError";
  }
}

function orderCandidates(candidates: Candidate[], recent: Set<string>): Candidate[] {
  const shuffle = (list: Candidate[]) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const fresh = candidates.filter((c) => !recent.has(c.imageUrl));
  const seen = candidates.filter((c) => recent.has(c.imageUrl));

  return [...shuffle(fresh), ...shuffle(seen)];
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
    [cfg.current?.imageUrl, ...cfg.history.slice(0, 10).map((h) => h.imageUrl)].filter(
      Boolean,
    ) as string[],
  );
  const ordered = orderCandidates(candidates, recent);

  let lastError: unknown = null;
  for (const candidate of ordered.slice(0, 12)) {
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
      const history = [record, ...cfg.history.filter((h) => h.imageUrl !== record.imageUrl)].slice(
        0,
        30,
      );
      await settingsStore.update({ current: record, history });
      void pruneCache(); // protects current + history itself
      logger.info("wallpaper", "Applied new wallpaper", { reason, provider: record.provider });
      broadcast("wallpaper:changed", { record });
      return record;
    } catch (error) {
      if (error instanceof WallpaperPermissionError) throw error; // no point retrying
      lastError = error;
      logger.warn("wallpaper", "Candidate failed, trying next", {
        imageUrl: candidate.imageUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (lastError instanceof WallpaperPermissionError) throw lastError;
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not download a suitable wallpaper for this theme. Please try again.");
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
  broadcast("wallpaper:changed", { record: updated });
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
