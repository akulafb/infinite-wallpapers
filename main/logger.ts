// Minimal scoped console logger for the main process.

type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, scope: string, message: string, data?: unknown): void {
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${message}`;
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (data === undefined) out(line);
  else out(line, data);
}

export const logger = {
  debug: (scope: string, message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") write("debug", scope, message, data);
  },
  info: (scope: string, message: string, data?: unknown) => write("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => write("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) => write("error", scope, message, data),
};
