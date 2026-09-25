// Preload: the only bridge between the web UI and the main process.
// Exposes a small, explicit API as window.api — never raw ipcRenderer.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

const api = {
  /** Call a main-process handler registered with ipcMain.handle(). */
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
    ipcRenderer.invoke(channel, ...args),

  /** Subscribe to a main-process push event. Returns an unsubscribe function. */
  on: (channel: string, callback: (payload: unknown) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;
