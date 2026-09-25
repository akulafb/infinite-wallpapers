// Downloads a chosen image to the wallpapers cache dir and keeps that dir
// bounded. Returns the local basename so callers can build a wallpaper:// URL.

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import { logger } from "../logger.js";

import { settingsStore, WALLPAPERS_DIR } from "./settings-store.js";

const MAX_CACHED_FILES = 40;
const MIN_BYTES = 20 * 1024; // reject tiny "images" that are really errors/thumbs

function extensionFor(contentType: string, url: string): string {
  if (/jpeg|jpg/i.test(contentType)) return ".jpg";
  if (/png/i.test(contentType)) return ".png";
  if (/webp/i.test(contentType)) return ".webp";
  const fromUrl = path.extname(new URL(url).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(fromUrl))
    return fromUrl === ".jpeg" ? ".jpg" : fromUrl;
  return ".jpg";
}

function detectImageType(buf: Buffer): { ext: string; contentType: string } | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: ".jpg", contentType: "image/jpeg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: ".png", contentType: "image/png" };
  }
  // WebP: RIFF .... WEBP
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: ".webp", contentType: "image/webp" };
  }
  return null;
}

export interface DownloadedImage {
  id: string;
  file: string; // basename inside WALLPAPERS_DIR
  absPath: string;
}

export async function downloadImage(imageUrl: string): Promise<DownloadedImage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh) InfiniteWallpapers/1.0" },
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    const contentTypeHeader = res.headers.get("content-type") ?? "";

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_BYTES)
      throw new Error("Downloaded image is too small to be a real wallpaper");

    const detected = detectImageType(buf);
    const isImageHeader = /image\//i.test(contentTypeHeader);

    if (!isImageHeader && !detected) {
      throw new Error(`Not an image (content-type: ${contentTypeHeader || "unknown"})`);
    }

    await fs.promises.mkdir(WALLPAPERS_DIR, { recursive: true });
    const id = crypto.randomUUID();
    const ext = detected?.ext ?? extensionFor(contentTypeHeader, imageUrl);
    const file = `${id}${ext}`;
    const absPath = path.join(WALLPAPERS_DIR, file);
    await fs.promises.writeFile(absPath, buf);
    void pruneCache();
    return { id, file, absPath };
  } finally {
    clearTimeout(timeout);
  }
}

// Keep only the most recently modified MAX_CACHED_FILES images, never deleting
// one that config still references. The protected set is derived here rather than
// passed in: as an optional `keepFiles` parameter it was opt-in, and the call in
// downloadImage() omitted it — silently deleting live history images and leaving
// the Recent strip rendering broken tiles.
export async function pruneCache(): Promise<void> {
  try {
    const entries = await fs.promises.readdir(WALLPAPERS_DIR);
    if (entries.length <= MAX_CACHED_FILES) return;
    const cfg = settingsStore.get();
    const keep = new Set(cfg.history.map((record) => record.file));
    if (cfg.current) keep.add(cfg.current.file);
    const stats = await Promise.all(
      entries.map(async (name) => ({
        name,
        mtime: (await fs.promises.stat(path.join(WALLPAPERS_DIR, name))).mtimeMs,
      })),
    );
    stats.sort((a, b) => b.mtime - a.mtime);
    const toDelete = stats.slice(MAX_CACHED_FILES).filter((s) => !keep.has(s.name));
    await Promise.all(
      toDelete.map((s) => fs.promises.rm(path.join(WALLPAPERS_DIR, s.name), { force: true })),
    );
  } catch (error) {
    logger.error("wallpaper", "Cache prune failed", error);
  }
}
