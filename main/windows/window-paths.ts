import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// The bundled backend runs from dist/main/index.js; everything else it needs
// sits next to it in dist/ (see scripts/build.mjs).
const DIST_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Absolute path to the built preload script. */
export function getPreloadPath(): string {
  return path.join(DIST_ROOT, "preload.cjs");
}

/** Absolute path to a bundled asset (tray icon etc.) in the project's assets/ folder. */
export function getAssetPath(name: string): string {
  return path.join(DIST_ROOT, "..", "assets", name);
}

/**
 * Resolve the URL for a window: the Vite dev server during `npm run dev`,
 * otherwise the built HTML file.
 */
export function getWindowUrl(htmlFileName: string): string {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) return new URL(htmlFileName, devServer).toString();
  return pathToFileURL(path.join(DIST_ROOT, "renderer", htmlFileName)).toString();
}
