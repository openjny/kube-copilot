import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOG_FILE = join(process.cwd(), "debug.log");

// Clear log file on startup
try {
  writeFileSync(
    LOG_FILE,
    `--- kube-copilot started at ${new Date().toISOString()} ---\n`,
  );
} catch {
  // ignore
}

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function write(level: LogLevel, ...args: unknown[]) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a, null, 2)))
    .join(" ");
  const line = `[${timestamp}] ${level}: ${message}\n`;
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // ignore write errors
  }
}

export const logger = {
  debug: (...args: unknown[]) => write("DEBUG", ...args),
  info: (...args: unknown[]) => write("INFO", ...args),
  warn: (...args: unknown[]) => write("WARN", ...args),
  error: (...args: unknown[]) => write("ERROR", ...args),
};
