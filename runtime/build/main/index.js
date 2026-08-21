
import { createRequire as __createRequire__ } from 'module';
const require = __createRequire__(import.meta.url);


// main/index.ts
import * as fs5 from "fs";
import * as path7 from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
import {
  app as app5,
  BrowserWindow as BrowserWindow2,
  Menu as Menu2,
  protocol,
  logger as logger14,
  initDevToolsButtonState
} from "@glaze/core/backend";

// main/handlers/index.ts
import * as path6 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// main/handlers/app.ts
import { logger } from "@glaze/core/backend";
var appHandlers = {
  // Example: Get app information
  getInfo: async () => {
    logger.info("app", "App info requested");
    return {
      name: "My Glaze App",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production"
    };
  }
  // TODO: Add your app handlers here
  // Example:
  // myMethod: async (params: { arg1: string }) => {
  //   return { result: 'success' };
  // }
};

// main/handlers/wallpaper.ts
import { ipcMain as ipcMain3, logger as logger11 } from "@glaze/core/backend";

// main/services/ai-query.ts
import { generateText, glaze, GlazeAIError } from "@glaze/core/ai";
import { logger as logger2 } from "@glaze/core/backend";
var SYSTEM = [
  "You convert a user's wallpaper wish into a concise web image-search query",
  "that finds real, high-resolution desktop wallpaper photos.",
  "Reply with ONLY the search query: 3 to 8 words, concrete visual nouns and",
  "style words, no quotes, no punctuation, no explanation."
].join(" ");
async function refineQuery(description) {
  const raw = description.trim();
  if (!raw) return { query: raw };
  try {
    const { text } = await generateText({
      model: glaze("fast"),
      system: SYSTEM,
      prompt: `Wish: ${raw}`,
      maxOutputTokens: 40
    });
    const cleaned = text.split("\n")[0].replace(/^["'`\s]+|["'`\s.]+$/g, "").trim();
    return { query: cleaned || raw };
  } catch (error) {
    if (error instanceof GlazeAIError) {
      logger2.info("ai-query", "AI unavailable, falling back to raw description", {
        state: error.state
      });
      return { query: raw, blocked: error.state };
    }
    logger2.error("ai-query", "AI query refinement failed", error);
    return { query: raw };
  }
}

// main/tray.ts
import { app as app3, Tray, Menu, logger as logger9 } from "@glaze/core/backend";

// main/services/rotation-scheduler.ts
import { app as app2, ipcMain as ipcMain2, logger as logger8 } from "@glaze/core/backend";

// main/services/wallpaper-service.ts
import * as path3 from "path";
import { ipcMain, logger as logger7 } from "@glaze/core/backend";

// main/services/image-search.ts
import { logger as logger4, screen } from "@glaze/core/backend";

// main/services/settings-store.ts
import * as fs from "fs";
import * as path from "path";
import { app, safeStorage, logger as logger3 } from "@glaze/core/backend";
var DATA_DIR = path.join(app.getPath("userData"), "wallpaper-cycle");
var CONFIG_PATH = path.join(DATA_DIR, "config.json");
var SECRET_PATH = path.join(DATA_DIR, "serper-key.bin");
var WALLPAPERS_DIR = path.join(DATA_DIR, "wallpapers");
var DEFAULT_THEME = {
  id: "nature",
  label: "Nature & Landscapes",
  query: "breathtaking nature landscape",
  kind: "preset",
  category: "landscape"
};
var MAX_HISTORY = 30;
var MAX_BLOCKED = 500;
function defaultConfig() {
  return {
    theme: DEFAULT_THEME,
    frequency: "daily",
    matureContent: true,
    aiAssist: true,
    minWidth: 1920,
    paused: false,
    current: null,
    history: [],
    blocked: [],
    nextRunAt: null
  };
}
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function normalize(raw) {
  const base = defaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw;
  const theme = r.theme && typeof r.theme === "object" ? { ...DEFAULT_THEME, ...r.theme } : DEFAULT_THEME;
  const freq = r.frequency;
  const frequency = freq === "hourly" || freq === "daily" || freq === "weekly" || freq === "manual" ? freq : base.frequency;
  return {
    theme,
    frequency,
    matureContent: typeof r.matureContent === "boolean" ? r.matureContent : base.matureContent,
    aiAssist: typeof r.aiAssist === "boolean" ? r.aiAssist : base.aiAssist,
    minWidth: typeof r.minWidth === "number" && r.minWidth > 0 ? r.minWidth : base.minWidth,
    paused: typeof r.paused === "boolean" ? r.paused : base.paused,
    current: r.current ?? null,
    history: Array.isArray(r.history) ? r.history.slice(0, MAX_HISTORY) : [],
    blocked: Array.isArray(r.blocked) ? r.blocked.slice(-MAX_BLOCKED) : [],
    nextRunAt: typeof r.nextRunAt === "number" ? r.nextRunAt : null
  };
}
var SettingsStore = class {
  cache = null;
  saveChain = Promise.resolve();
  async load() {
    if (this.cache) return this.cache;
    ensureDir(DATA_DIR);
    ensureDir(WALLPAPERS_DIR);
    try {
      const text = await fs.promises.readFile(CONFIG_PATH, "utf-8");
      this.cache = normalize(JSON.parse(text));
    } catch (error) {
      if (error.code === "ENOENT") {
        this.cache = defaultConfig();
      } else {
        logger3.error("settings", "Failed to read config; using in-memory defaults", error);
        this.cache = defaultConfig();
      }
    }
    return this.cache;
  }
  get() {
    return this.cache ?? defaultConfig();
  }
  // Merge a partial patch into the config and persist atomically.
  async update(patch) {
    const current = await this.load();
    const next = normalize({ ...current, ...patch });
    this.cache = next;
    await this.persist(next);
    return next;
  }
  persist(cfg) {
    this.saveChain = this.saveChain.then(async () => {
      ensureDir(DATA_DIR);
      const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(cfg, null, 2), "utf-8");
      await fs.promises.rename(tmp, CONFIG_PATH);
    });
    return this.saveChain;
  }
  // Drop config references to cached images that are no longer on disk. An
  // earlier build pruned the cache without protecting files still referenced by
  // history, so existing installs carry history entries whose image is gone —
  // which renders as a broken tile in the Recent strip. Runs once at startup.
  async reconcileHistory() {
    const cfg = await this.load();
    const onDisk = async (file) => {
      try {
        await fs.promises.access(path.join(WALLPAPERS_DIR, file));
        return true;
      } catch {
        return false;
      }
    };
    const present = await Promise.all(cfg.history.map((record) => onDisk(record.file)));
    const history = cfg.history.filter((_, index) => present[index]);
    const current = cfg.current;
    const currentGone = current !== null && !await onDisk(current.file);
    if (history.length === cfg.history.length && !currentGone) return;
    logger3.info("settings", "Dropped config references to missing wallpaper files", {
      removedFromHistory: cfg.history.length - history.length,
      clearedCurrent: currentGone
    });
    await this.update({ history, current: currentGone ? null : current });
  }
  // ── Serper API key (encrypted) ─────────────────────────────────────
  async hasSerperKey() {
    try {
      await fs.promises.access(SECRET_PATH);
      return true;
    } catch {
      return false;
    }
  }
  async getSerperKey() {
    try {
      const buf = await fs.promises.readFile(SECRET_PATH);
      if (!await safeStorage.isEncryptionAvailable()) return null;
      return await safeStorage.decryptString(buf);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      logger3.error("settings", "Failed to decrypt Serper key", error);
      return null;
    }
  }
  async setSerperKey(key) {
    ensureDir(DATA_DIR);
    const trimmed = key.trim();
    if (!trimmed) {
      await fs.promises.rm(SECRET_PATH, { force: true });
      return;
    }
    if (!await safeStorage.isEncryptionAvailable()) {
      throw new Error("Secure storage is unavailable on this system; cannot save the API key.");
    }
    const encrypted = await safeStorage.encryptString(trimmed);
    const tmp = `${SECRET_PATH}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, encrypted);
    await fs.promises.rename(tmp, SECRET_PATH);
  }
};
var settingsStore = new SettingsStore();

// main/services/image-search.ts
var BLOCKED_DOMAINS = [
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
  "fbcdn.net"
];
function hostBlocked(url) {
  const lower = url.toLowerCase();
  return BLOCKED_DOMAINS.some((d) => lower.includes(d));
}
var DEFAULT_ASPECT = 16 / 9;
var MIN_ASPECT = 1.2;
var MAX_ASPECT = 4;
var ASPECT_TOLERANCE = 1.35;
var ASPECT_CACHE_MS = 6e4;
var WALLHAVEN_RATIO_BUCKETS = [
  { aspect: 4 / 3, ratios: "4x3,16x10" },
  { aspect: 16 / 10, ratios: "16x10,16x9" },
  { aspect: 16 / 9, ratios: "16x9,16x10" },
  { aspect: 21 / 9, ratios: "21x9,16x9" },
  { aspect: 32 / 9, ratios: "32x9,21x9" }
];
var aspectCache = null;
function displayAspect() {
  const now = Date.now();
  if (aspectCache && now - aspectCache.at < ASPECT_CACHE_MS) return aspectCache.value;
  let aspect = DEFAULT_ASPECT;
  try {
    const display = screen.getPrimaryDisplay();
    const width = display.size.width || display.bounds.width;
    const height = display.size.height || display.bounds.height;
    if (width > 0 && height > 0) aspect = width / height;
  } catch (e) {
    logger4.warn("search", "Primary display unavailable; assuming 16:9", e);
  }
  const clamped = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, aspect));
  aspectCache = { value: clamped, at: now };
  return clamped;
}
function wallhavenRatios(aspect) {
  let best = WALLHAVEN_RATIO_BUCKETS[0];
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
function wallhavenAtleast(minWidth, aspect) {
  return `${minWidth}x${Math.min(1080, Math.round(minWidth / aspect))}`;
}
function suitableForDisplay(w, h, minWidth, aspect) {
  if (w < minWidth || h <= 0) return false;
  const ratio = w / h;
  return ratio >= Math.max(MIN_ASPECT, aspect / ASPECT_TOLERANCE) && ratio <= aspect * ASPECT_TOLERANCE;
}
async function searchSerper(apiKey, opts) {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      q: `${opts.query} 4k wallpaper`,
      num: 40,
      gl: "us",
      hl: "en",
      safe: opts.matureContent ? "off" : "active"
    }),
    signal: AbortSignal.timeout(2e4)
  });
  if (!res.ok) {
    throw new Error(`Serper error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const images = data.images ?? [];
  return images.filter(
    (img) => Boolean(img.imageUrl)
  ).map((img) => ({
    imageUrl: img.imageUrl,
    thumbnailUrl: img.thumbnailUrl ?? img.imageUrl,
    pageUrl: img.link ?? img.imageUrl,
    provider: "serper",
    width: img.imageWidth ?? 0,
    height: img.imageHeight ?? 0,
    title: img.title ?? ""
  }));
}
function wallhavenCategories(category) {
  switch (category) {
    case "anime":
      return "010";
    case "people":
      return "001";
    case "landscape":
    case "general":
      return "100";
    default:
      return "111";
  }
}
async function searchWallhaven(opts) {
  const aspect = displayAspect();
  const params = new URLSearchParams({
    q: opts.query,
    categories: wallhavenCategories(opts.category),
    purity: opts.matureContent ? "110" : "100",
    // sfw(+sketchy); nsfw needs an API key
    sorting: "relevance",
    atleast: wallhavenAtleast(opts.minWidth, aspect),
    ratios: wallhavenRatios(aspect),
    ai_art_filter: "1"
    // exclude AI-generated art where honored
  });
  const res = await fetch(`https://wallhaven.cc/api/v1/search?${params.toString()}`, {
    headers: { "User-Agent": "InfiniteWallpapers/1.0" },
    signal: AbortSignal.timeout(2e4)
  });
  if (!res.ok) throw new Error(`Wallhaven error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const items = data.data ?? [];
  return items.filter((it) => Boolean(it.path)).map((it) => ({
    imageUrl: it.path,
    thumbnailUrl: it.thumbs?.large ?? it.thumbs?.small ?? it.path,
    pageUrl: it.url ?? it.path,
    provider: "wallhaven",
    width: it.dimension_x ?? 0,
    height: it.dimension_y ?? 0,
    title: ""
  }));
}
function interleave(a, b) {
  const out = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}
async function wallhavenThumbnail(query, category) {
  const tryQuery = async (q) => {
    const results = await searchWallhaven({
      query: q,
      category,
      matureContent: false,
      minWidth: 1280,
      blocked: []
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
async function searchImages(opts) {
  const apiKey = await settingsStore.getSerperKey();
  const tasks = [];
  if (apiKey)
    tasks.push(
      searchSerper(apiKey, opts).catch((e) => (logger4.error("search", "Serper failed", e), []))
    );
  tasks.push(
    searchWallhaven(opts).catch((e) => (logger4.error("search", "Wallhaven failed", e), []))
  );
  const [serperResults = [], wallhavenResults = []] = apiKey ? await Promise.all(tasks) : [[], await tasks[0]];
  const merged = interleave(serperResults, wallhavenResults);
  const aspect = displayAspect();
  const blockedSet = new Set(opts.blocked);
  const seen = /* @__PURE__ */ new Set();
  const filtered = [];
  for (const c of merged) {
    if (seen.has(c.imageUrl) || blockedSet.has(c.imageUrl)) continue;
    if (hostBlocked(c.pageUrl) || hostBlocked(c.imageUrl)) continue;
    if (c.provider !== "wallhaven" && !suitableForDisplay(c.width, c.height, opts.minWidth, aspect))
      continue;
    seen.add(c.imageUrl);
    filtered.push(c);
  }
  return filtered;
}

// main/services/wallpaper-download.ts
import * as crypto from "crypto";
import * as fs2 from "fs";
import * as path2 from "path";
import { logger as logger5 } from "@glaze/core/backend";
var MAX_CACHED_FILES = 40;
var MIN_BYTES = 20 * 1024;
function extensionFor(contentType, url) {
  if (/jpeg|jpg/i.test(contentType)) return ".jpg";
  if (/png/i.test(contentType)) return ".png";
  if (/webp/i.test(contentType)) return ".webp";
  const fromUrl = path2.extname(new URL(url).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(fromUrl))
    return fromUrl === ".jpeg" ? ".jpg" : fromUrl;
  return ".jpg";
}
async function downloadImage(imageUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3e4);
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh) InfiniteWallpapers/1.0" }
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!/image\//i.test(contentType))
      throw new Error(`Not an image (content-type: ${contentType || "unknown"})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_BYTES)
      throw new Error("Downloaded image is too small to be a real wallpaper");
    await fs2.promises.mkdir(WALLPAPERS_DIR, { recursive: true });
    const id = crypto.randomUUID();
    const file = `${id}${extensionFor(contentType, imageUrl)}`;
    const absPath = path2.join(WALLPAPERS_DIR, file);
    await fs2.promises.writeFile(absPath, buf);
    void pruneCache();
    return { id, file, absPath };
  } finally {
    clearTimeout(timeout);
  }
}
async function pruneCache() {
  try {
    const entries = await fs2.promises.readdir(WALLPAPERS_DIR);
    if (entries.length <= MAX_CACHED_FILES) return;
    const cfg = settingsStore.get();
    const keep = new Set(cfg.history.map((record) => record.file));
    if (cfg.current) keep.add(cfg.current.file);
    const stats = await Promise.all(
      entries.map(async (name) => ({
        name,
        mtime: (await fs2.promises.stat(path2.join(WALLPAPERS_DIR, name))).mtimeMs
      }))
    );
    stats.sort((a, b) => b.mtime - a.mtime);
    const toDelete = stats.slice(MAX_CACHED_FILES).filter((s) => !keep.has(s.name));
    await Promise.all(
      toDelete.map((s) => fs2.promises.rm(path2.join(WALLPAPERS_DIR, s.name), { force: true }))
    );
  } catch (error) {
    logger5.error("wallpaper", "Cache prune failed", error);
  }
}

// main/services/wallpaper-setter.ts
import { execFile } from "child_process";
import { promisify } from "util";
import { logger as logger6 } from "@glaze/core/backend";
var execFileAsync = promisify(execFile);
var WallpaperPermissionError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "WallpaperPermissionError";
  }
};
function escapeForAppleScript(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function setWallpaper(filePath) {
  const escaped = escapeForAppleScript(filePath);
  const script = [
    'tell application "System Events"',
    "  tell every desktop",
    `    set picture to "${escaped}"`,
    "  end tell",
    "end tell"
  ].join("\n");
  try {
    await execFileAsync("osascript", ["-e", script], {
      timeout: 15e3,
      maxBuffer: 1024 * 1024
    });
    logger6.info("wallpaper", "Wallpaper applied", { filePath });
  } catch (error) {
    const stderr = String(error.stderr ?? error.message ?? "");
    if (/not authorized|-1743|1743|permission/i.test(stderr)) {
      throw new WallpaperPermissionError(
        "Infinite Wallpapers needs Automation permission to control System Events. Open System Settings \u203A Privacy & Security \u203A Automation and enable it for this app."
      );
    }
    logger6.error("wallpaper", "Failed to set wallpaper", { stderr });
    throw new Error(`Failed to set wallpaper: ${stderr || "unknown error"}`);
  }
}
async function checkAutomationPermission() {
  const script = 'tell application "System Events" to get name of first desktop';
  try {
    await execFileAsync("osascript", ["-e", script], { timeout: 1e4, maxBuffer: 64 * 1024 });
    return true;
  } catch {
    return false;
  }
}

// main/services/wallpaper-service.ts
var NoImagesError = class extends Error {
  constructor() {
    super(
      "No suitable wallpapers were found for this theme. Try a different theme or turn on mature content."
    );
    this.name = "NoImagesError";
  }
};
function pickFresh(candidates, recent) {
  const fresh = candidates.filter((c) => !recent.has(c.imageUrl));
  const pool = fresh.length > 0 ? fresh : candidates;
  const top = pool.slice(0, Math.min(20, pool.length));
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  return top;
}
async function search() {
  const cfg = settingsStore.get();
  const candidates = await searchImages({
    query: cfg.theme.query,
    category: cfg.theme.category,
    matureContent: cfg.matureContent,
    minWidth: cfg.minWidth,
    blocked: cfg.blocked
  });
  return candidates;
}
async function previewCandidates() {
  const candidates = await search();
  return candidates.slice(0, 12);
}
async function applyNext(reason) {
  const cfg = settingsStore.get();
  const candidates = await search();
  if (candidates.length === 0) throw new NoImagesError();
  const recent = new Set(
    [cfg.current?.imageUrl, ...cfg.history.slice(0, 10).map((h) => h.imageUrl)].filter(
      Boolean
    )
  );
  const ordered = pickFresh(candidates, recent);
  let lastError = null;
  for (const candidate of ordered.slice(0, 6)) {
    try {
      const downloaded = await downloadImage(candidate.imageUrl);
      await setWallpaper(downloaded.absPath);
      const record = {
        id: downloaded.id,
        file: downloaded.file,
        imageUrl: candidate.imageUrl,
        pageUrl: candidate.pageUrl,
        provider: candidate.provider,
        width: candidate.width,
        height: candidate.height,
        themeLabel: cfg.theme.label,
        appliedAt: Date.now()
      };
      const history = [record, ...cfg.history.filter((h) => h.imageUrl !== record.imageUrl)].slice(
        0,
        30
      );
      await settingsStore.update({ current: record, history });
      void pruneCache();
      logger7.info("wallpaper", "Applied new wallpaper", { reason, provider: record.provider });
      ipcMain.broadcast("wallpaper:changed", { record });
      return record;
    } catch (error) {
      if (error instanceof WallpaperPermissionError) throw error;
      lastError = error;
      logger7.error("wallpaper", "Candidate failed, trying next", error);
    }
  }
  throw lastError instanceof Error ? lastError : new NoImagesError();
}
async function applyFromHistory(id) {
  const cfg = settingsStore.get();
  const record = cfg.history.find((h) => h.id === id);
  if (!record) throw new Error("That wallpaper is no longer available.");
  const absPath = path3.join(WALLPAPERS_DIR, record.file);
  await setWallpaper(absPath);
  const updated = { ...record, appliedAt: Date.now() };
  const history = [updated, ...cfg.history.filter((h) => h.id !== id)].slice(0, 30);
  await settingsStore.update({ current: updated, history });
  ipcMain.broadcast("wallpaper:changed", { record: updated });
  return updated;
}
async function skipCurrent() {
  const cfg = settingsStore.get();
  if (cfg.current) {
    const blocked = [...cfg.blocked, cfg.current.imageUrl];
    await settingsStore.update({ blocked });
  }
  return applyNext("skip");
}

// main/services/rotation-scheduler.ts
var INTERVAL_MS = {
  hourly: 60 * 60 * 1e3,
  daily: 24 * 60 * 60 * 1e3,
  weekly: 7 * 24 * 60 * 60 * 1e3
};
var WATCHDOG_MS = 60 * 1e3;
var RotationScheduler = class {
  timer = null;
  watchdog = null;
  // Set while a rotation is running so the timer and the watchdog — which can
  // both come due at once — never start overlapping rotations.
  ticking = false;
  clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }
  broadcastState() {
    const cfg = settingsStore.get();
    ipcMain2.broadcast("rotation:changed", {
      paused: cfg.paused,
      frequency: cfg.frequency,
      nextRunAt: cfg.nextRunAt
    });
  }
  // Arm both the countdown and the watchdog for an already-decided due time.
  arm(nextRunAt) {
    this.clear();
    this.timer = setTimeout(() => void this.tick(), Math.max(0, nextRunAt - Date.now()));
    this.watchdog = setInterval(() => {
      const due = settingsStore.get().nextRunAt;
      if (due !== null && Date.now() >= due) void this.tick();
    }, WATCHDOG_MS);
  }
  // Clear any timer and drop the persisted due time (paused / manual).
  async disarm() {
    this.clear();
    if (settingsStore.get().nextRunAt !== null) await settingsStore.update({ nextRunAt: null });
    this.broadcastState();
  }
  // Start a fresh full interval from now. Used for explicit user actions
  // (next/skip, frequency change, pause/resume) where restarting the clock is
  // the intended behaviour.
  async reschedule() {
    this.clear();
    const cfg = settingsStore.get();
    if (cfg.paused || cfg.frequency === "manual") {
      await this.disarm();
      return;
    }
    const nextRunAt = Date.now() + INTERVAL_MS[cfg.frequency];
    await settingsStore.update({ nextRunAt });
    this.arm(nextRunAt);
    this.broadcastState();
  }
  // Startup path: honour the persisted due time instead of resetting it.
  async armFromPersisted() {
    this.clear();
    const cfg = settingsStore.get();
    if (cfg.paused || cfg.frequency === "manual") {
      await this.disarm();
      return;
    }
    if (cfg.nextRunAt === null) {
      await this.reschedule();
      return;
    }
    if (Date.now() >= cfg.nextRunAt) {
      logger8.info("rotation", `Rotation overdue by ${Date.now() - cfg.nextRunAt}ms; catching up`);
      void this.tick();
      return;
    }
    this.arm(cfg.nextRunAt);
    this.broadcastState();
  }
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    this.clear();
    try {
      await applyNext("scheduled");
    } catch (error) {
      logger8.error("rotation", "Scheduled rotation failed", error);
    } finally {
      this.ticking = false;
      try {
        await this.reschedule();
      } catch (error) {
        logger8.error("rotation", "Failed to reschedule after rotation", error);
      }
    }
  }
  async start() {
    app2.on("before-quit", () => this.clear());
    await this.armFromPersisted();
  }
};
var rotationScheduler = new RotationScheduler();

// main/tray.ts
var TRAY_GUID = "b7d3f0a2-6c41-4e58-9a2b-1f7c2d9e4a10";
var tray = null;
var callbacks = { openMainWindow: () => {
}, openSettings: () => {
} };
function buildMenu() {
  const cfg = settingsStore.get();
  const freqLabel = cfg.frequency === "manual" ? "Manual only" : cfg.frequency[0].toUpperCase() + cfg.frequency.slice(1);
  return Menu.buildFromTemplate([
    { label: `Theme: ${cfg.theme.label}`, enabled: false },
    { label: cfg.paused ? "Rotation paused" : `Changes: ${freqLabel}`, enabled: false },
    { type: "separator" },
    {
      label: "Next Wallpaper",
      click: async () => {
        try {
          await applyNext("tray");
          await rotationScheduler.reschedule();
        } catch (error) {
          logger9.error("tray", "Next wallpaper failed", error);
        }
        refreshTray();
      }
    },
    cfg.paused ? {
      label: "Resume Rotation",
      click: async () => {
        await settingsStore.update({ paused: false });
        await rotationScheduler.reschedule();
        refreshTray();
      }
    } : {
      label: "Pause Rotation",
      click: async () => {
        await settingsStore.update({ paused: true });
        await rotationScheduler.reschedule();
        refreshTray();
      }
    },
    { type: "separator" },
    { label: "Open Infinite Wallpapers", click: () => callbacks.openMainWindow() },
    { label: "Settings\u2026", click: () => void callbacks.openSettings() },
    { type: "separator" },
    { label: "Quit Infinite Wallpapers", click: () => app3.quit() }
  ]);
}
function createTray(cbs) {
  callbacks = cbs;
  if (tray && !tray.isDestroyed()) return;
  tray = new Tray("photo.on.rectangle.angled", TRAY_GUID);
  tray.setToolTip("Infinite Wallpapers");
  tray.setContextMenu(buildMenu());
  app3.on("before-quit", () => {
    tray?.destroy();
    tray = null;
  });
  logger9.info("tray", "Tray created");
}
function refreshTray() {
  if (tray && !tray.isDestroyed()) tray.setContextMenu(buildMenu());
}

// main/services/theme-thumbnails.ts
import * as fs3 from "fs";
import * as path4 from "path";
import { app as app4, logger as logger10 } from "@glaze/core/backend";
var CACHE_PATH = path4.join(app4.getPath("userData"), "wallpaper-cycle", "theme-thumbs.json");
var TTL_MS = 14 * 24 * 60 * 60 * 1e3;
var ThemeThumbnails = class {
  cache = null;
  inflight = /* @__PURE__ */ new Map();
  saveChain = Promise.resolve();
  async loadCache() {
    if (this.cache) return this.cache;
    try {
      this.cache = JSON.parse(await fs3.promises.readFile(CACHE_PATH, "utf-8"));
    } catch {
      this.cache = {};
    }
    return this.cache;
  }
  persist() {
    const data = this.cache ?? {};
    this.saveChain = this.saveChain.then(async () => {
      try {
        await fs3.promises.mkdir(path4.dirname(CACHE_PATH), { recursive: true });
        const tmp = `${CACHE_PATH}.${process.pid}.tmp`;
        await fs3.promises.writeFile(tmp, JSON.stringify(data), "utf-8");
        await fs3.promises.rename(tmp, CACHE_PATH);
      } catch (error) {
        logger10.error("theme-thumbs", "Failed to persist cache", error);
      }
    });
  }
  async get(presetId, query, category) {
    const cache = await this.loadCache();
    const existing = cache[presetId];
    if (existing && Date.now() - existing.fetchedAt < TTL_MS) return existing.url;
    const pending = this.inflight.get(presetId);
    if (pending) return pending;
    const task = (async () => {
      let url = null;
      try {
        url = await wallhavenThumbnail(query, category);
      } catch (error) {
        logger10.error("theme-thumbs", "Thumbnail fetch failed", { presetId, error });
      }
      cache[presetId] = { url, fetchedAt: url ? Date.now() : 0 };
      this.persist();
      this.inflight.delete(presetId);
      return url;
    })();
    this.inflight.set(presetId, task);
    return task;
  }
};
var themeThumbnails = new ThemeThumbnails();

// main/handlers/wallpaper.ts
function asRecord(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid arguments");
  return value;
}
var CATEGORIES = ["web", "landscape", "anime", "people", "general"];
function parseTheme(value) {
  const r = asRecord(value);
  const id = typeof r.id === "string" ? r.id : "";
  const label = typeof r.label === "string" ? r.label : "";
  const query = typeof r.query === "string" ? r.query.trim() : "";
  const category = CATEGORIES.includes(r.category) ? r.category : "web";
  const kind = r.kind === "custom" ? "custom" : "preset";
  if (!id || !label || !query) throw new Error("Theme requires id, label and query");
  return { id, label, query, kind, category };
}
async function broadcastConfig() {
  ipcMain3.broadcast("config:changed", {
    config: settingsStore.get(),
    hasSerperKey: await settingsStore.hasSerperKey()
  });
}
async function state() {
  const cfg = settingsStore.get();
  return { paused: cfg.paused, frequency: cfg.frequency, nextRunAt: cfg.nextRunAt };
}
function registerWallpaperHandlers() {
  ipcMain3.handle("config:get", async () => {
    const config = await settingsStore.load();
    return { config, hasSerperKey: await settingsStore.hasSerperKey() };
  });
  ipcMain3.handle("theme:setPreset", async (_e, theme) => {
    const config = await settingsStore.update({ theme: parseTheme(theme) });
    refreshTray();
    return config;
  });
  ipcMain3.handle("theme:setCustom", async (_e, description) => {
    if (typeof description !== "string" || !description.trim()) {
      throw new Error("Please enter a description.");
    }
    const cfg = settingsStore.get();
    let query = description.trim();
    let aiBlocked;
    if (cfg.aiAssist) {
      const refined = await refineQuery(description);
      query = refined.query;
      aiBlocked = refined.blocked;
    }
    const theme = {
      id: `custom-${Date.now()}`,
      label: description.trim().slice(0, 60),
      query,
      kind: "custom",
      category: "web"
    };
    const config = await settingsStore.update({ theme });
    refreshTray();
    return { config, aiBlocked };
  });
  ipcMain3.handle("settings:update", async (_e, patch) => {
    const r = asRecord(patch);
    const next = {};
    if (r.frequency === "hourly" || r.frequency === "daily" || r.frequency === "weekly" || r.frequency === "manual") {
      next.frequency = r.frequency;
    }
    if (typeof r.matureContent === "boolean") next.matureContent = r.matureContent;
    if (typeof r.aiAssist === "boolean") next.aiAssist = r.aiAssist;
    if (typeof r.minWidth === "number" && r.minWidth >= 640) next.minWidth = r.minWidth;
    const config = await settingsStore.update(next);
    if (next.frequency !== void 0) await rotationScheduler.reschedule();
    refreshTray();
    await broadcastConfig();
    return config;
  });
  ipcMain3.handle("serper:setKey", async (_e, key) => {
    if (typeof key !== "string") throw new Error("Invalid key");
    await settingsStore.setSerperKey(key);
    await broadcastConfig();
    return settingsStore.hasSerperKey();
  });
  ipcMain3.handle("serper:hasKey", async () => settingsStore.hasSerperKey());
  ipcMain3.handle("theme:thumbnail", async (_e, args) => {
    const r = asRecord(args);
    const presetId = typeof r.presetId === "string" ? r.presetId : "";
    const query = typeof r.query === "string" ? r.query : "";
    const category = CATEGORIES.includes(r.category) ? r.category : "general";
    if (!presetId || !query) return null;
    return themeThumbnails.get(presetId, query, category);
  });
  ipcMain3.handle("wallpaper:preview", async () => previewCandidates());
  ipcMain3.handle("wallpaper:next", async () => {
    const record = await applyNext("manual");
    await rotationScheduler.reschedule();
    refreshTray();
    return record;
  });
  ipcMain3.handle("wallpaper:skip", async () => {
    const record = await skipCurrent();
    await rotationScheduler.reschedule();
    refreshTray();
    return record;
  });
  ipcMain3.handle("wallpaper:applyFromHistory", async (_e, id) => {
    if (typeof id !== "string") throw new Error("Invalid id");
    return applyFromHistory(id);
  });
  ipcMain3.handle("rotation:pause", async () => {
    await settingsStore.update({ paused: true });
    await rotationScheduler.reschedule();
    refreshTray();
    return state();
  });
  ipcMain3.handle("rotation:resume", async () => {
    await settingsStore.update({ paused: false });
    await rotationScheduler.reschedule();
    refreshTray();
    return state();
  });
  ipcMain3.handle("rotation:getState", async () => state());
  ipcMain3.handle("permissions:checkAutomation", async () => checkAutomationPermission());
  logger11.info("handlers", "\u2713 Infinite Wallpapers handlers registered");
}

// main/windows/settings-window.ts
import { BrowserWindow, logger as logger12 } from "@glaze/core/backend";

// main/windows/window-paths.ts
import * as fs4 from "fs";
import * as path5 from "path";
import { fileURLToPath, pathToFileURL } from "url";
var currentFilePath = fileURLToPath(import.meta.url);
var currentDirPath = path5.dirname(currentFilePath);
var BUILD_ROOT = path5.resolve(currentDirPath, "..");
function resolveWindowHtml(htmlFileName) {
  return path5.join(BUILD_ROOT, htmlFileName);
}
function getWindowFileUrl(htmlFileName) {
  return pathToFileURL(resolveWindowHtml(htmlFileName)).toString();
}
function getPreloadPath() {
  return path5.join(BUILD_ROOT, "assets", "preload.js");
}
async function getWindowUrl(htmlFileName) {
  const devServerHostFile = path5.join(BUILD_ROOT, "..", ".devserverhost");
  if (fs4.existsSync(devServerHostFile)) {
    try {
      const devServerHost = (await fs4.promises.readFile(devServerHostFile, "utf-8")).trim();
      if (devServerHost) {
        return `${devServerHost}/${htmlFileName}`;
      }
    } catch {
    }
  }
  return getWindowFileUrl(htmlFileName);
}

// main/windows/settings-window.ts
var settingsWindow = null;
async function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    logger12.debug("settings", "Settings window already exists, showing it");
    settingsWindow.show();
    return;
  }
  logger12.info("settings", "Creating settings window");
  settingsWindow = new BrowserWindow({
    windowKey: "settings",
    width: 560,
    height: 640,
    minWidth: 460,
    minHeight: 520,
    title: "Settings",
    show: false,
    center: true,
    webPreferences: {
      preload: getPreloadPath()
    }
  });
  settingsWindow.once("ready-to-show", () => {
    settingsWindow?.show();
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
  const url = await getWindowUrl("settings-window.html");
  logger12.info("settings", "Loading settings URL", { url });
  await settingsWindow.loadURL(url);
}
function getSettingsWindow() {
  return settingsWindow;
}

// main/handlers/index.ts
import { ipcMain as ipcMain4, logger as logger13 } from "@glaze/core/backend";
var __filename = fileURLToPath2(import.meta.url);
var __dirname = path6.dirname(__filename);
function registerHandlers() {
  logger13.info("handlers", "Registering IPC handlers...");
  ipcMain4.handle("app:getInfo", async (_event) => {
    return await appHandlers.getInfo();
  });
  ipcMain4.handle("app:getProjectPath", async () => {
    return path6.join(__dirname, "..", "..");
  });
  ipcMain4.handle("window:openSettings", async (_event) => {
    await openSettingsWindow();
  });
  ipcMain4.handle("window:closeSettings", async (_event) => {
    getSettingsWindow()?.close();
  });
  registerWallpaperHandlers();
  logger13.info("handlers", "\u2713 IPC handlers registered");
}

// main/index.ts
var __filename2 = fileURLToPath3(import.meta.url);
var __dirname2 = path7.dirname(__filename2);
registerHandlers();
protocol.registerSchemesAsPrivileged([
  {
    scheme: "wallpaper",
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
]);
function contentTypeFor(file) {
  if (/\.png$/i.test(file)) return "image/png";
  if (/\.webp$/i.test(file)) return "image/webp";
  return "image/jpeg";
}
protocol.handle("wallpaper", (request) => {
  const file = new URL(request.url).searchParams.get("file");
  if (!file) {
    return { statusCode: 400, data: "Missing file", headers: { "Content-Type": "text/plain" } };
  }
  return protocol.createFileResponse(file, {
    root: WALLPAPERS_DIR,
    headers: { "Content-Type": contentTypeFor(file), "Cache-Control": "no-cache" }
  });
});
var devHarness = null;
var appAiDevHarness = null;
if (false) {
  devHarness = await null;
  devHarness.applyParityScenarioStartup();
  appAiDevHarness = await null;
}
var mainWindow = null;
async function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    logger14.debug("main", "Main window already exists, skipping creation");
    return;
  }
  const packageJsonPath = path7.join(__dirname2, "..", "..", "package.json");
  const minWindowWidth = 480;
  const minWindowHeight = 560;
  const windowWidth = 780;
  const windowHeight = 760;
  let windowTitle = "Glaze App";
  try {
    if (fs5.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await fs5.promises.readFile(packageJsonPath, "utf-8"));
      windowTitle = packageJson.productName || packageJson.appConfig?.displayName || windowTitle;
    }
  } catch {
  }
  const browserWindowStartTime = Date.now();
  logger14.info("main", "\u23F1\uFE0F [COLD_START] Creating BrowserWindow", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  mainWindow = new BrowserWindow2({
    windowKey: "main",
    // Stable key for frame persistence
    width: windowWidth,
    height: windowHeight,
    minWidth: minWindowWidth,
    minHeight: minWindowHeight,
    title: windowTitle,
    show: false,
    // Don't show until WebView is ready (prevents flickering)
    webPreferences: {
      preload: getPreloadPath()
    }
  });
  const browserWindowEndTime = Date.now();
  logger14.info("main", "\u23F1\uFE0F [COLD_START] BrowserWindow constructor completed", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    duration_ms: browserWindowEndTime - browserWindowStartTime
  });
  mainWindow.once("ready-to-show", () => {
    const showStartTime = Date.now();
    logger14.info("main", "\u23F1\uFE0F [COLD_START] ready-to-show event received, showing window", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    mainWindow?.show();
    const showEndTime = Date.now();
    logger14.info("main", "\u23F1\uFE0F [COLD_START] Window shown", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      duration_ms: showEndTime - showStartTime
    });
  });
  const url = await getWindowUrl("main-window.html");
  logger14.info("main", "Resolved main window URL", { url });
  const loadURLStartTime = Date.now();
  logger14.info("main", "\u23F1\uFE0F [COLD_START] Loading URL in window", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    url
  });
  await mainWindow.loadURL(url);
  const loadURLEndTime = Date.now();
  logger14.info("main", "\u23F1\uFE0F [COLD_START] URL loaded in window (waiting for ready-to-show)", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    duration_ms: loadURLEndTime - loadURLStartTime
  });
}
function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    void createMainWindow();
  }
}
async function setupApplicationMenu() {
  await initDevToolsButtonState();
  const menu = Menu2.buildFromTemplate([
    {
      label: "App",
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Settings\u2026",
          icon: "gearshape",
          accelerator: "Command+,",
          click: async () => await openSettingsWindow()
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ]);
  Menu2.setApplicationMenu(menu);
  logger14.info("main", "Application menu configured with Settings");
}
app5.on("window-all-closed", () => {
});
app5.on("activate", (hasVisibleWindows) => {
  logger14.info("main", "App activate event received", {
    hasVisibleWindows,
    mainWindowExists: !!mainWindow,
    mainWindowDestroyed: mainWindow?.isDestroyed() ?? true
  });
  if (!hasVisibleWindows) {
    if (!mainWindow || mainWindow.isDestroyed()) {
      logger14.info("main", "Creating main window due to activate event");
      createMainWindow();
    } else {
      logger14.info("main", "Showing existing main window");
      mainWindow.show();
    }
  } else {
    logger14.info("main", "Has visible windows, no action needed");
  }
});
app5.on("before-quit", () => {
  logger14.info("main", "App before-quit, cleaning up...");
});
var startTime = Date.now();
logger14.info("main", "\u23F1\uFE0F [COLD_START] Waiting for app ready...", {
  timestamp: (/* @__PURE__ */ new Date()).toISOString()
});
app5.whenReady().then(async () => {
  const windowCreateStartTime = Date.now();
  logger14.info("main", "\u23F1\uFE0F [COLD_START] App ready, creating main window", {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    wait_duration_ms: windowCreateStartTime - startTime
  });
  await devHarness?.runParityAutotestIfRequested();
  await appAiDevHarness?.runAppAiAutotest();
  await setupApplicationMenu();
  await settingsStore.load();
  await settingsStore.reconcileHistory();
  await rotationScheduler.start();
  createTray({
    openMainWindow: showMainWindow,
    openSettings: () => openSettingsWindow()
  });
  createMainWindow().then(() => {
    const windowCreateEndTime = Date.now();
    logger14.info("main", "\u23F1\uFE0F [COLD_START] Main window created successfully", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      duration_ms: windowCreateEndTime - windowCreateStartTime
    });
  }).catch((error) => {
    logger14.error("main", "Failed to create main window", error);
  });
});
//# sourceMappingURL=index.js.map
