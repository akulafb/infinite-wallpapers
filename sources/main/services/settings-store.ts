// Durable settings + encrypted secret storage for Wallpaper Cycle.
//
// Config lives as JSON under app.getPath("userData"); the Serper API key is
// stored separately, encrypted with safeStorage. Writes are atomic (temp file +
// rename) and serialized so overlapping saves can't corrupt the file.

import * as fs from "fs";
import * as path from "path";

import { app, safeStorage, logger } from "@glaze/core/backend";

import type { AppConfig, ThemeConfig } from "./types.js";

const DATA_DIR = path.join(app.getPath("userData"), "wallpaper-cycle");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const SECRET_PATH = path.join(DATA_DIR, "serper-key.bin");
export const WALLPAPERS_DIR = path.join(DATA_DIR, "wallpapers");

const DEFAULT_THEME: ThemeConfig = {
  id: "nature",
  label: "Nature & Landscapes",
  query: "breathtaking nature landscape",
  kind: "preset",
  category: "landscape",
};

const MAX_HISTORY = 30;
const MAX_BLOCKED = 500;

function defaultConfig(): AppConfig {
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
    nextRunAt: null,
  };
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

// Normalize whatever we parsed from disk into a valid AppConfig, filling gaps
// with defaults so an older/partial file never crashes the app.
function normalize(raw: unknown): AppConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const theme =
    r.theme && typeof r.theme === "object"
      ? { ...DEFAULT_THEME, ...(r.theme as Partial<ThemeConfig>) }
      : DEFAULT_THEME;

  const freq = r.frequency;
  const frequency =
    freq === "hourly" || freq === "daily" || freq === "weekly" || freq === "manual" ? freq : base.frequency;

  return {
    theme,
    frequency,
    matureContent: typeof r.matureContent === "boolean" ? r.matureContent : base.matureContent,
    aiAssist: typeof r.aiAssist === "boolean" ? r.aiAssist : base.aiAssist,
    minWidth: typeof r.minWidth === "number" && r.minWidth > 0 ? r.minWidth : base.minWidth,
    paused: typeof r.paused === "boolean" ? r.paused : base.paused,
    current: (r.current as AppConfig["current"]) ?? null,
    history: Array.isArray(r.history) ? (r.history as AppConfig["history"]).slice(0, MAX_HISTORY) : [],
    blocked: Array.isArray(r.blocked) ? (r.blocked as string[]).slice(-MAX_BLOCKED) : [],
    nextRunAt: typeof r.nextRunAt === "number" ? r.nextRunAt : null,
  };
}

class SettingsStore {
  private cache: AppConfig | null = null;
  private saveChain: Promise<void> = Promise.resolve();

  async load(): Promise<AppConfig> {
    if (this.cache) return this.cache;
    ensureDir(DATA_DIR);
    ensureDir(WALLPAPERS_DIR);
    try {
      const text = await fs.promises.readFile(CONFIG_PATH, "utf-8");
      this.cache = normalize(JSON.parse(text));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.cache = defaultConfig();
      } else {
        // Surface parse/permission/IO errors instead of silently wiping data.
        logger.error("settings", "Failed to read config; using in-memory defaults", error);
        this.cache = defaultConfig();
      }
    }
    return this.cache;
  }

  get(): AppConfig {
    return this.cache ?? defaultConfig();
  }

  // Merge a partial patch into the config and persist atomically.
  async update(patch: Partial<AppConfig>): Promise<AppConfig> {
    const current = await this.load();
    const next: AppConfig = normalize({ ...current, ...patch });
    this.cache = next;
    await this.persist(next);
    return next;
  }

  private persist(cfg: AppConfig): Promise<void> {
    this.saveChain = this.saveChain.then(async () => {
      ensureDir(DATA_DIR);
      const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, JSON.stringify(cfg, null, 2), "utf-8");
      await fs.promises.rename(tmp, CONFIG_PATH);
    });
    return this.saveChain;
  }

  // ── Serper API key (encrypted) ─────────────────────────────────────
  async hasSerperKey(): Promise<boolean> {
    try {
      await fs.promises.access(SECRET_PATH);
      return true;
    } catch {
      return false;
    }
  }

  async getSerperKey(): Promise<string | null> {
    try {
      const buf = await fs.promises.readFile(SECRET_PATH);
      if (!(await safeStorage.isEncryptionAvailable())) return null;
      return await safeStorage.decryptString(buf);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      logger.error("settings", "Failed to decrypt Serper key", error);
      return null;
    }
  }

  async setSerperKey(key: string): Promise<void> {
    ensureDir(DATA_DIR);
    const trimmed = key.trim();
    if (!trimmed) {
      await fs.promises.rm(SECRET_PATH, { force: true });
      return;
    }
    if (!(await safeStorage.isEncryptionAvailable())) {
      throw new Error("Secure storage is unavailable on this system; cannot save the API key.");
    }
    const encrypted = await safeStorage.encryptString(trimmed);
    const tmp = `${SECRET_PATH}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, encrypted);
    await fs.promises.rename(tmp, SECRET_PATH);
  }
}

export const settingsStore = new SettingsStore();
