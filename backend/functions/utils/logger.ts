// utils/logger.ts — structured non-sensitive logger

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level:     LogLevel;
  message:   string;
  context?:  Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  // Never log file content, OCR text, or user data
  const safe = JSON.stringify(entry);
  if (level === "error") {
    console.error(safe);
  } else if (level === "warn") {
    console.warn(safe);
  } else {
    console.log(safe);
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => log("info",  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => log("warn",  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
};