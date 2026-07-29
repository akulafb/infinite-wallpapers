// Schedules automatic wallpaper changes at the configured frequency. Uses a
// single timer that is always cleared before being replaced and on before-quit.

import { app, ipcMain, logger } from "@glaze/core/backend";

import { applyNext } from "./wallpaper-service.js";
import { settingsStore } from "./settings-store.js";
import type { Frequency } from "./types.js";

const INTERVAL_MS: Record<Exclude<Frequency, "manual">, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

class RotationScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  broadcastState(): void {
    const cfg = settingsStore.get();
    ipcMain.broadcast("rotation:changed", {
      paused: cfg.paused,
      frequency: cfg.frequency,
      nextRunAt: cfg.nextRunAt,
    });
  }

  // (Re)compute the next fire time and arm the timer.
  async reschedule(): Promise<void> {
    this.clear();
    const cfg = settingsStore.get();
    if (cfg.paused || cfg.frequency === "manual") {
      if (cfg.nextRunAt !== null) await settingsStore.update({ nextRunAt: null });
      this.broadcastState();
      return;
    }
    const interval = INTERVAL_MS[cfg.frequency];
    const nextRunAt = Date.now() + interval;
    await settingsStore.update({ nextRunAt });
    this.timer = setTimeout(() => void this.tick(), interval);
    this.broadcastState();
  }

  private async tick(): Promise<void> {
    try {
      await applyNext("scheduled");
    } catch (error) {
      logger.error("rotation", "Scheduled rotation failed", error);
    }
    await this.reschedule();
  }

  async start(): Promise<void> {
    await this.reschedule();
    app.on("before-quit", () => this.clear());
  }
}

export const rotationScheduler = new RotationScheduler();
