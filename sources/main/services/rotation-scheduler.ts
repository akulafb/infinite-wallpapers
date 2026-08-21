// Schedules automatic wallpaper changes at the configured frequency.
//
// The persisted `nextRunAt` is the source of truth across restarts: on launch we
// arm from it rather than restarting a full interval, so a machine that sleeps or
// quits past its due time still rotates (catching up immediately when overdue).
// A long setTimeout alone is unreliable across macOS sleep/wake, so a 60s
// watchdog also fires once the wall-clock deadline has passed. Both timers are
// always cleared before being replaced and on before-quit.

import { app, ipcMain, logger } from "@glaze/core/backend";

import { applyNext } from "./wallpaper-service.js";
import { settingsStore } from "./settings-store.js";
import type { Frequency } from "./types.js";

const INTERVAL_MS: Record<Exclude<Frequency, "manual">, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

// How often the watchdog compares wall-clock time against the due time.
const WATCHDOG_MS = 60 * 1000;

class RotationScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  // Set while a rotation is running so the timer and the watchdog — which can
  // both come due at once — never start overlapping rotations.
  private ticking = false;

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
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

  // Arm both the countdown and the watchdog for an already-decided due time.
  private arm(nextRunAt: number): void {
    this.clear();
    this.timer = setTimeout(() => void this.tick(), Math.max(0, nextRunAt - Date.now()));
    this.watchdog = setInterval(() => {
      const due = settingsStore.get().nextRunAt;
      if (due !== null && Date.now() >= due) void this.tick();
    }, WATCHDOG_MS);
  }

  // Clear any timer and drop the persisted due time (paused / manual).
  private async disarm(): Promise<void> {
    this.clear();
    if (settingsStore.get().nextRunAt !== null) await settingsStore.update({ nextRunAt: null });
    this.broadcastState();
  }

  // Start a fresh full interval from now. Used for explicit user actions
  // (next/skip, frequency change, pause/resume) where restarting the clock is
  // the intended behaviour.
  async reschedule(): Promise<void> {
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
  private async armFromPersisted(): Promise<void> {
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
      // Overdue: the app was quit or asleep past its due time. Catch up now,
      // then start the next interval (tick reschedules even if it fails).
      logger.info("rotation", `Rotation overdue by ${Date.now() - cfg.nextRunAt}ms; catching up`);
      // Deliberately not awaited: start() runs before the window is created, and a
      // catch-up does a network fetch + image download. Blocking here would stall
      // launch. tick() never rejects — it logs and always re-arms.
      void this.tick();
      return;
    }
    this.arm(cfg.nextRunAt);
    this.broadcastState();
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    // Stop the timers first so a slow rotation can't be re-triggered mid-flight.
    this.clear();
    try {
      await applyNext("scheduled");
    } catch (error) {
      // A failure (e.g. no network at login) must never leave the app unarmed.
      logger.error("rotation", "Scheduled rotation failed", error);
    } finally {
      this.ticking = false;
      try {
        await this.reschedule();
      } catch (error) {
        logger.error("rotation", "Failed to reschedule after rotation", error);
      }
    }
  }

  async start(): Promise<void> {
    // Register teardown before arming so a quit during startup still clears timers.
    app.on("before-quit", () => this.clear());
    await this.armFromPersisted();
  }
}

export const rotationScheduler = new RotationScheduler();
