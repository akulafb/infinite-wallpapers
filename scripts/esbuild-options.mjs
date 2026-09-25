// Shared esbuild settings for the main-process and preload bundles.

/** @type {import("esbuild").BuildOptions} */
export const mainOptions = {
  entryPoints: ["main/index.ts"],
  outfile: "dist/main/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["electron"],
  sourcemap: true,
};

// Sandboxed preloads must be CommonJS.
/** @type {import("esbuild").BuildOptions} */
export const preloadOptions = {
  entryPoints: ["renderer/preload.ts"],
  outfile: "dist/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
  sourcemap: true,
};
