// Production build: renderer (Vite) + main process and preload (esbuild) into dist/.

import { rm } from "fs/promises";

import * as esbuild from "esbuild";
import { build as viteBuild } from "vite";

import { mainOptions, preloadOptions } from "./esbuild-options.mjs";

await rm("dist", { recursive: true, force: true });
await viteBuild({ configFile: "vite.config.ts", logLevel: "warn" });
await Promise.all([esbuild.build(mainOptions), esbuild.build(preloadOptions)]);
console.log("Built to dist/");
