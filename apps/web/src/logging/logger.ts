export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel = import.meta.env.DEV ? "debug" : "warn";

function shouldLog(level: LogLevel): boolean {
  if (import.meta.env.MODE === "test") {
    return false;
  }
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatFields(fields?: Record<string, unknown>): string {
  if (!fields || Object.keys(fields).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(fields)}`;
}

function write(level: LogLevel, component: string, event: string, fields?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const message = `[pixelanea] ${component} ${event}${formatFields(fields)}`;

  switch (level) {
    case "debug":
      console.debug(message);
      break;
    case "info":
      console.info(message);
      break;
    case "warn":
      console.warn(message);
      break;
    case "error":
      console.error(message);
      break;
  }
}

export const logger = {
  debug(component: string, event: string, fields?: Record<string, unknown>): void {
    write("debug", component, event, fields);
  },

  info(component: string, event: string, fields?: Record<string, unknown>): void {
    write("info", component, event, fields);
  },

  warn(component: string, event: string, fields?: Record<string, unknown>): void {
    write("warn", component, event, fields);
  },

  error(component: string, event: string, fields?: Record<string, unknown>): void {
    write("error", component, event, fields);
  },
};

export function errorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
