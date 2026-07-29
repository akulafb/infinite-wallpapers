// IPC handlers for Wallpaper Cycle. Thin boundary: validate inputs, delegate to
// services, return contract-shaped results.

import { ipcMain, logger } from "@glaze/core/backend";

import { refineQuery } from "../services/ai-query.js";
import { refreshTray } from "../tray.js";
import { rotationScheduler } from "../services/rotation-scheduler.js";
import { settingsStore } from "../services/settings-store.js";
import {
  applyFromHistory,
  applyNext,
  previewCandidates,
  skipCurrent,
} from "../services/wallpaper-service.js";
import { checkAutomationPermission } from "../services/wallpaper-setter.js";
import type { AppConfig, Frequency, ThemeCategory, ThemeConfig } from "../services/types.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("Invalid arguments");
  return value as Record<string, unknown>;
}

const CATEGORIES: ThemeCategory[] = ["web", "landscape", "anime", "people", "general"];

function parseTheme(value: unknown): ThemeConfig {
  const r = asRecord(value);
  const id = typeof r.id === "string" ? r.id : "";
  const label = typeof r.label === "string" ? r.label : "";
  const query = typeof r.query === "string" ? r.query.trim() : "";
  const category = CATEGORIES.includes(r.category as ThemeCategory) ? (r.category as ThemeCategory) : "web";
  const kind = r.kind === "custom" ? "custom" : "preset";
  if (!id || !label || !query) throw new Error("Theme requires id, label and query");
  return { id, label, query, kind, category };
}

async function state(): Promise<{ paused: boolean; frequency: Frequency; nextRunAt: number | null }> {
  const cfg = settingsStore.get();
  return { paused: cfg.paused, frequency: cfg.frequency, nextRunAt: cfg.nextRunAt };
}

export function registerWallpaperHandlers(): void {
  ipcMain.handle("config:get", async () => {
    const config = await settingsStore.load();
    return { config, hasSerperKey: await settingsStore.hasSerperKey() };
  });

  ipcMain.handle("theme:setPreset", async (_e, theme: unknown): Promise<AppConfig> => {
    const config = await settingsStore.update({ theme: parseTheme(theme) });
    refreshTray();
    return config;
  });

  ipcMain.handle("theme:setCustom", async (_e, description: unknown) => {
    if (typeof description !== "string" || !description.trim()) {
      throw new Error("Please enter a description.");
    }
    const cfg = settingsStore.get();
    let query = description.trim();
    let aiBlocked: string | undefined;
    if (cfg.aiAssist) {
      const refined = await refineQuery(description);
      query = refined.query;
      aiBlocked = refined.blocked;
    }
    const theme: ThemeConfig = {
      id: `custom-${Date.now()}`,
      label: description.trim().slice(0, 60),
      query,
      kind: "custom",
      category: "web",
    };
    const config = await settingsStore.update({ theme });
    refreshTray();
    return { config, aiBlocked };
  });

  ipcMain.handle("settings:update", async (_e, patch: unknown): Promise<AppConfig> => {
    const r = asRecord(patch);
    const next: Partial<AppConfig> = {};
    if (r.frequency === "hourly" || r.frequency === "daily" || r.frequency === "weekly" || r.frequency === "manual") {
      next.frequency = r.frequency;
    }
    if (typeof r.matureContent === "boolean") next.matureContent = r.matureContent;
    if (typeof r.aiAssist === "boolean") next.aiAssist = r.aiAssist;
    if (typeof r.minWidth === "number" && r.minWidth >= 640) next.minWidth = r.minWidth;
    const config = await settingsStore.update(next);
    if (next.frequency !== undefined) await rotationScheduler.reschedule();
    refreshTray();
    return config;
  });

  ipcMain.handle("serper:setKey", async (_e, key: unknown): Promise<boolean> => {
    if (typeof key !== "string") throw new Error("Invalid key");
    await settingsStore.setSerperKey(key);
    return settingsStore.hasSerperKey();
  });

  ipcMain.handle("serper:hasKey", async () => settingsStore.hasSerperKey());

  ipcMain.handle("wallpaper:preview", async () => previewCandidates());

  ipcMain.handle("wallpaper:next", async () => {
    const record = await applyNext("manual");
    await rotationScheduler.reschedule();
    refreshTray();
    return record;
  });

  ipcMain.handle("wallpaper:skip", async () => {
    const record = await skipCurrent();
    await rotationScheduler.reschedule();
    refreshTray();
    return record;
  });

  ipcMain.handle("wallpaper:applyFromHistory", async (_e, id: unknown) => {
    if (typeof id !== "string") throw new Error("Invalid id");
    return applyFromHistory(id);
  });

  ipcMain.handle("rotation:pause", async () => {
    await settingsStore.update({ paused: true });
    await rotationScheduler.reschedule();
    refreshTray();
    return state();
  });

  ipcMain.handle("rotation:resume", async () => {
    await settingsStore.update({ paused: false });
    await rotationScheduler.reschedule();
    refreshTray();
    return state();
  });

  ipcMain.handle("rotation:getState", async () => state());

  ipcMain.handle("permissions:checkAutomation", async () => checkAutomationPermission());

  logger.info("handlers", "✓ Wallpaper Cycle handlers registered");
}
