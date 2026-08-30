// Multi-source image search. Serper.dev provides whole-web Google Images results
// (needs a user-supplied API key); Wallhaven is a free, no-key wallpaper source.
// Results are merged, filtered for desktop suitability, and de-duplicated.

import { logger, screen } from "@glaze/core/backend";

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

// ── Display-aware aspect matching ────────────────────────────────────
// macOS fills the desktop from the image, so anything far from the display's own
// aspect gets cropped or letterboxed. We target the primary display instead of a
// fixed 16:9 band, which would mis-serve 21:9 and 32:9 users (and vice versa).

const DEFAULT_ASPECT = 16 / 9; // used until the display is readable
const MIN_ASPECT = 1.2; // portrait/rotated displays still get landscape wallpaper
const MAX_ASPECT = 4.0; // guards against absurd reported sizes (48x9 is 5.33)
const ASPECT_TOLERANCE = 1.35; // multiplicative band; ~16:9 => 1.32..2.40
const ASPECT_CACHE_MS = 60_000; // displays change rarely; never query per candidate

// Wallhaven indexes a fixed set of ratio buckets, so we snap to the nearest one
// and add a neighbour — asking for a single niche bucket returns almost nothing.
const WALLHAVEN_RATIO_BUCKETS = [
  { aspect: 4 / 3, ratios: "4x3,16x10" },
  { aspect: 16 / 10, ratios: "16x10,16x9" },
  { aspect: 16 / 9, ratios: "16x9,16x10" },
  { aspect: 21 / 9, ratios: "21x9,16x9" },
  { aspect: 32 / 9, ratios: "32x9,21x9" },
] as const;

let aspectCache: { value: number; at: number } | null = null;

// Primary-display aspect ratio, clamped and memoised. Reads `screen` (a public
// @glaze/core/backend export) lazily so a not-yet-ready backend just degrades to
// the 16:9 default rather than throwing mid-search.
function displayAspect(): number {
  const now = Date.now();
  if (aspectCache && now - aspectCache.at < ASPECT_CACHE_MS) return aspectCache.value;
  let aspect = DEFAULT_ASPECT;
  try {
    const display = screen.getPrimaryDisplay();
    const width = display.size.width || display.bounds.width;
    const height = display.size.height || display.bounds.height;
    if (width > 0 && height > 0) aspect = width / height;
  } catch (e) {
    logger.warn("search", "Primary display unavailable; assuming 16:9", e);
  }
  const clamped = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect));
  aspectCache = { value: clamped, at: now };
  return clamped;
}

// Nearest Wallhaven bucket by log-distance, so 2.33 snaps to 21x9 rather than
// being pulled toward the numerically closer-but-perceptually-wrong 16x9.
function wallhavenRatios(aspect: number): string {
  let best: (typeof WALLHAVEN_RATIO_BUCKETS)[number] = WALLHAVEN_RATIO_BUCKETS[0];
  let bestDistance = Infinity;
  for (const bucket of WALLHAVEN_RATIO_BUCKETS) {
    const distance = Math.abs(Math.log(aspect / bucket.aspect));
    if (distance < bestDistance) {
      best = bucket;
      bestDistance = distance;
    }
  }
  return best.ratios;
}

// `atleast` is width x height, so a fixed 1080 height would reject every genuine
// ultrawide image (a 1920-wide 32:9 shot is only 540 tall). Derive the height from
// the target aspect, but never demand more than the original 1080 floor.
function wallhavenAtleast(minWidth: number, aspect: number): string {
  return `${minWidth}x${Math.min(1080, Math.round(minWidth / aspect))}`;
}

function suitableForDisplay(w: number, h: number, minWidth: number, aspect: number): boolean {
  if (w < minWidth || h <= 0) return false;
  const ratio = w / h;
  // MIN_ASPECT floor: even on a 4:3 display, a near-square image is not a wallpaper.
  return (
    ratio >= Math.max(MIN_ASPECT, aspect / ASPECT_TOLERANCE) && ratio <= aspect * ASPECT_TOLERANCE
  );
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
    .filter((img): img is Required<Pick<SerperImage, "imageUrl">> & SerperImage =>
      Boolean(img.imageUrl),
    )
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

function cleanWallhavenQuery(rawQuery: string): string {
  const stripped = rawQuery
    .replace(
      /\b(4k|8k|hd|wallpaper|wallpapers|background|backgrounds|high resolution|hires|desktop)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return stripped || rawQuery.trim();
}

async function searchWallhaven(opts: SearchOptions): Promise<Candidate[]> {
  const aspect = displayAspect();
  const executeSearch = async (query: string): Promise<Candidate[]> => {
    const params = new URLSearchParams({
      q: query,
      categories: wallhavenCategories(opts.category),
      purity: opts.matureContent ? "110" : "100", // sfw(+sketchy); nsfw needs an API key
      sorting: "relevance",
      atleast: wallhavenAtleast(opts.minWidth, aspect),
      ratios: wallhavenRatios(aspect),
      ai_art_filter: "1", // exclude AI-generated art where honored
    });
    const res = await fetch(`https://wallhaven.cc/api/v1/search?${params.toString()}`, {
      headers: { "User-Agent": "InfiniteWallpapers/1.0" },
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
  };

  const cleaned = cleanWallhavenQuery(opts.query);
  const attempts = [cleaned];
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 2) attempts.push(words.slice(0, 2).join(" "));
  if (words.length > 1) attempts.push(words[0]);

  for (const q of attempts) {
    try {
      const candidates = await executeSearch(q);
      if (candidates.length > 0) return candidates;
    } catch (err) {
      logger.warn("search", `Wallhaven attempt failed for "${q}"`, err);
    }
  }
  return [];
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

// Cheap single-thumbnail lookup for preset cards. Wallhaven only (free, no key)
// and SFW so preview tiles stay tasteful regardless of the mature-content toggle.
// Falls back to progressively simpler queries so specific phrases still yield art.
export async function wallhavenThumbnail(
  query: string,
  category: ThemeCategory,
): Promise<string | null> {
  const tryQuery = async (q: string): Promise<string | null> => {
    const results = await searchWallhaven({
      query: q,
      category,
      matureContent: false,
      minWidth: 1280,
      blocked: [],
    });
    return results[0]?.thumbnailUrl ?? null;
  };
  const words = query.trim().split(/\s+/);
  const attempts = [query];
  if (words.length > 2) attempts.push(words.slice(-2).join(" "));
  if (words.length > 1) attempts.push(words[words.length - 1]);
  for (const attempt of attempts) {
    const url = await tryQuery(attempt);
    if (url) return url;
  }
  return null;
}

export async function searchImages(opts: SearchOptions): Promise<Candidate[]> {
  const apiKey = await settingsStore.getSerperKey();
  const tasks: Promise<Candidate[]>[] = [];
  if (apiKey)
    tasks.push(
      searchSerper(apiKey, opts).catch((e) => (logger.error("search", "Serper failed", e), [])),
    );
  tasks.push(
    searchWallhaven(opts).catch((e) => (logger.error("search", "Wallhaven failed", e), [])),
  );

  const [serperResults = [], wallhavenResults = []] = apiKey
    ? await Promise.all(tasks)
    : [[], await tasks[0]];

  const merged = interleave(serperResults, wallhavenResults);
  const aspect = displayAspect(); // hoisted: one display read for the whole pass
  const blockedSet = new Set(opts.blocked);
  const seen = new Set<string>();
  const filtered: Candidate[] = [];
  for (const c of merged) {
    if (seen.has(c.imageUrl) || blockedSet.has(c.imageUrl)) continue;
    if (hostBlocked(c.pageUrl) || hostBlocked(c.imageUrl)) continue;
    // Wallhaven already enforces atleast/ratios; trust it even if dims are 0.
    if (c.provider !== "wallhaven" && !suitableForDisplay(c.width, c.height, opts.minWidth, aspect))
      continue;
    seen.add(c.imageUrl);
    filtered.push(c);
  }
  return filtered;
}
