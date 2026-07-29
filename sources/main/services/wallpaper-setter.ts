// Sets the macOS desktop wallpaper by shelling out to osascript/AppleScript.
// There is no native wallpaper API, so this is the supported path. The first
// call triggers a macOS Automation (System Events) permission prompt.

import { execFile } from "child_process";
import { promisify } from "util";

import { logger } from "@glaze/core/backend";

const execFileAsync = promisify(execFile);

export class WallpaperPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WallpaperPermissionError";
  }
}

function escapeForAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Apply the image at `filePath` to every desktop / space.
export async function setWallpaper(filePath: string): Promise<void> {
  const escaped = escapeForAppleScript(filePath);
  const script = [
    'tell application "System Events"',
    "  tell every desktop",
    `    set picture to "${escaped}"`,
    "  end tell",
    "end tell",
  ].join("\n");

  try {
    await execFileAsync("osascript", ["-e", script], {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    });
    logger.info("wallpaper", "Wallpaper applied", { filePath });
  } catch (error) {
    const stderr = String((error as { stderr?: string }).stderr ?? (error as Error).message ?? "");
    if (/not authorized|-1743|1743|permission/i.test(stderr)) {
      throw new WallpaperPermissionError(
        "Wallpaper Cycle needs Automation permission to control System Events. " +
          "Open System Settings › Privacy & Security › Automation and enable it for this app.",
      );
    }
    logger.error("wallpaper", "Failed to set wallpaper", { stderr });
    throw new Error(`Failed to set wallpaper: ${stderr || "unknown error"}`);
  }
}

// A cheap no-op AppleScript used to detect whether Automation permission is
// already granted, without changing the wallpaper.
export async function checkAutomationPermission(): Promise<boolean> {
  const script = 'tell application "System Events" to get name of first desktop';
  try {
    await execFileAsync("osascript", ["-e", script], { timeout: 10_000, maxBuffer: 64 * 1024 });
    return true;
  } catch {
    return false;
  }
}
