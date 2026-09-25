// Development: Vite dev server (hot reload for the UI) + esbuild watch for the
// main process and preload. Electron restarts whenever the backend rebuilds.

import { spawn } from "child_process";

import electronPath from "electron";
import * as esbuild from "esbuild";
import { createServer } from "vite";

import { mainOptions, preloadOptions } from "./esbuild-options.mjs";

const server = await createServer({ configFile: "vite.config.ts" });
await server.listen();
const devServerUrl = server.resolvedUrls.local[0];

let electron = null;
let quitting = false;

function startElectron() {
  if (electron) {
    electron.removeAllListeners("exit");
    electron.kill();
  }
  electron = spawn(String(electronPath), ["."], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development", VITE_DEV_SERVER_URL: devServerUrl },
  });
  // Quitting the app from its menu ends the dev session.
  electron.on("exit", () => {
    if (!quitting) void shutdown();
  });
}

let restartTimer = null;
const restartPlugin = {
  name: "restart-electron",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      clearTimeout(restartTimer);
      restartTimer = setTimeout(startElectron, 100);
    });
  },
};

const contexts = await Promise.all([
  esbuild.context({ ...mainOptions, plugins: [restartPlugin] }),
  esbuild.context({ ...preloadOptions, plugins: [restartPlugin] }),
]);
await Promise.all(contexts.map((ctx) => ctx.watch()));

async function shutdown() {
  quitting = true;
  electron?.kill();
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
  await server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
