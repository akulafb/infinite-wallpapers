// Persistent per-preset sample thumbnail cache for the theme picker gallery.
// Each preset's representative image URL is fetched once from Wallhaven and
// cached on disk, so the picker is free and instant on subsequent launches.

import * as fs from "fs";
import * as path from "path";

import { app, logger } from "@glaze/core/backend";

import { wallhavenThumbnail } from "./image-search.js";
import type { ThemeCategory } from "./types.js";

const CACHE_PATH = path.join(app.getPath("userData"), "wallpaper-cycle", "theme-thumbs.json");
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

interface Entry {
  url: string | null;
  fetchedAt: number;
}

class ThemeThumbnails {
  private cache: Record<string, Entry> | null = null;
  private inflight = new Map<string, Promise<string | null>>();
  private saveChain: Promise<void> = Promise.resolve();

  private async loadCache(): Promise<Record<string, Entry>> {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await fs.promises.readFile(CACHE_PATH, "utf-8")) as Record<string, Entry>;
    } catch {
      this.cache = {};
    }
    return this.cache;
  }

  private persist(): void {
    const data = this.cache ?? {};
    this.saveChain = this.saveChain.then(async () => {
      try {
        await fs.promises.mkdir(path.dirname(CACHE_PATH), { recursive: true });
        const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
        await fs.promises.writeFile(tmp, JSON.stringify(data), "utf-8");
        await fs.promises.rename(tmp, CACHE_PATH);
      } catch (error) {
        logger.error("theme-thumbs", "Failed to persist cache", error);
      }
    });
  }

  async get(presetId: string, query: string, category: ThemeCategory): Promise<string | null> {
    const cache = await this.loadCache();
    const existing = cache[presetId];
    if (existing && Date.now() - existing.fetchedAt < TTL_MS) return existing.url;

    const pending = this.inflight.get(presetId);
    if (pending) return pending;

    const task = (async () => {
      let url: string | null = null;
      try {
        url = await wallhavenThumbnail(query, category);
      } catch (error) {
        logger.error("theme-thumbs", "Thumbnail fetch failed", { presetId, error });
      }
      // Cache successes for the full TTL; always retry misses on the next request
      // (fetchedAt 0 is treated as stale) so a temporary empty result self-heals.
      cache[presetId] = { url, fetchedAt: url ? Date.now() : 0 };
      this.persist();
      this.inflight.delete(presetId);
      return url;
    })();
    this.inflight.set(presetId, task);
    return task;
  }
}

export const themeThumbnails = new ThemeThumbnails();
