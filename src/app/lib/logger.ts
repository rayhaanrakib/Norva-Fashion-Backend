type Level = "info" | "warn" | "error";

const stamp = () => new Date().toISOString();

const emit = (level: Level, message: string, meta?: unknown) => {
  const line = `[${stamp()}] ${level.toUpperCase()} ${message}`;
  if (level === "error") console.error(line, meta ?? "");
  else if (level === "warn") console.warn(line, meta ?? "");
  else console.log(line, meta ?? "");
};

export const logger = {
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
