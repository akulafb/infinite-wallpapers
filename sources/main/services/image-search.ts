// Multi-source image search. Serper.dev provides whole-web Google Images results
// (needs a user-supplied API key); Wallhaven is a free, no-key wallpaper source.
// Results are merged, filtered for desktop suitability, and de-duplicated.

import { logger } from "@glaze/core/backend";

import { settingsStore } from "./settings-store.js";
import type { Candidate, ThemeCategory } from "./types.js";

export interface SearchOptions {
  query: string;
  category: ThemeCategory;
  matureContent: boolean;
  minWidth: number;
  blocked: string[];
}

// Stock/preview domains that watermark their images — excluded from web results.
const BLOCKED_DOMAINS = [
  "shutterstock.com",
  "gettyimages.",
  "istockphoto.com",
  "alamy.com",
  "dreamstime.com",
  "depositphotos.com",
  "123rf.com",
  "stock.adobe.com",
  "vecteezy.com",
  "canstockphoto.com",
  "agefotostock.com",
  "shutterstock",
  "pinterest.",
  "lookaside.",
  "fbcdn.net",
];

function hostBlocked(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCKED_DOMAINS.some((d) => lower.includes(d));
}

function landscapeEnough(w: number, h: number, minWidth: number): boolean {
  if (w < minWidth || h <= 0) return false;
  const ratio = w / h;
  return ratio >= 1.2 && ratio <= 2.5; // desktop-ish (4:3 .. 21:9-ish)
}

// ── Serper.dev (Google Images, whole web) ────────────────────────────
interface SerperImage {
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  link?: string;
  source?: string;
  title?: string;
}

async function searchSerper(apiKey: string, opts: SearchOptions): Promise<Candidate[]> {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: `${opts.query} 4k wallpaper`,
      num: 40,
      gl: "us",
      hl: "en",
      safe: opts.matureContent ? "off" : "active",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Serper error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { images?: SerperImage[] };
  const images = data.images ?? [];
  return images
    .filter((img): img is Required<Pick<SerperImage, "imageUrl">> & SerperImage => Boolean(img.imageUrl))
    .map((img) => ({
      imageUrl: img.imageUrl!,
      thumbnailUrl: img.thumbnailUrl ?? img.imageUrl!,
      pageUrl: img.link ?? img.imageUrl!,
      provider: "serper",
      width: img.imageWidth ?? 0,
      height: img.imageHeight ?? 0,
      title: img.title ?? "",
    }));
}

// ── Wallhaven (free, no key) ─────────────────────────────────────────
interface WallhavenItem {
  path?: string;
  url?: string;
  dimension_x?: number;
  dimension_y?: number;
  thumbs?: { large?: string; original?: string; small?: string };
}

function wallhavenCategories(category: ThemeCategory): string {
  // bits: general / anime / people
  switch (category) {
    case "anime":
      return "010";
    case "people":
      return "001";
    case "landscape":
    case "general":
      return "100";
    default:
      return "111"; // web/custom — search everything
  }
}

async function searchWallhaven(opts: SearchOptions): Promise<Candidate[]> {
  const params = new URLSearchParams({
    q: opts.query,
    categories: wallhavenCategories(opts.category),
    purity: opts.matureContent ? "110" : "100", // sfw(+sketchy); nsfw needs an API key
    sorting: "relevance",
    atleast: `${opts.minWidth}x1080`,
    ratios: "16x9,16x10",
    ai_art_filter: "1", // exclude AI-generated art where honored
  });
  const res = await fetch(`https://wallhaven.cc/api/v1/search?${params.toString()}`, {
    headers: { "User-Agent": "WallpaperCycle/1.0" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Wallhaven error: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { data?: WallhavenItem[] };
  const items = data.data ?? [];
  return items
    .filter((it): it is Required<Pick<WallhavenItem, "path">> & WallhavenItem => Boolean(it.path))
    .map((it) => ({
      imageUrl: it.path!,
      thumbnailUrl: it.thumbs?.large ?? it.thumbs?.small ?? it.path!,
      pageUrl: it.url ?? it.path!,
      provider: "wallhaven",
      width: it.dimension_x ?? 0,
      height: it.dimension_y ?? 0,
      title: "",
    }));
}

// Interleave two arrays so results from both providers are represented near the top.
function interleave(a: Candidate[], b: Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export async function searchImages(opts: SearchOptions): Promise<Candidate[]> {
  const apiKey = await settingsStore.getSerperKey();
  const tasks: Promise<Candidate[]>[] = [];
  if (apiKey) tasks.push(searchSerper(apiKey, opts).catch((e) => (logger.error("search", "Serper failed", e), [])));
  tasks.push(searchWallhaven(opts).catch((e) => (logger.error("search", "Wallhaven failed", e), [])));

  const [serperResults = [], wallhavenResults = []] = apiKey ? await Promise.all(tasks) : [[], await tasks[0]];

  const merged = interleave(serperResults, wallhavenResults);
  const blockedSet = new Set(opts.blocked);
  const seen = new Set<string>();
  const filtered: Candidate[] = [];
  for (const c of merged) {
    if (seen.has(c.imageUrl) || blockedSet.has(c.imageUrl)) continue;
    if (hostBlocked(c.pageUrl) || hostBlocked(c.imageUrl)) continue;
    // Wallhaven already enforces atleast/ratios; trust it even if dims are 0.
    if (c.provider !== "wallhaven" && !landscapeEnough(c.width, c.height, opts.minWidth)) continue;
    seen.add(c.imageUrl);
    filtered.push(c);
  }
  return filtered;
}
