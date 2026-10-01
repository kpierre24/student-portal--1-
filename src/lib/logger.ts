type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel = "info";

  setLevel(level: LogLevel) {
    this.level = level;
  }

  shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  log(level: LogLevel, args: unknown[]) {
    if (!this.shouldLog(level)) return;
    const prefix = `[${level.toUpperCase()}]`;
    console.log(prefix, ...args);
  }

  debug(...args: unknown[]) {
    this.log("debug", args);
  }

  info(...args: unknown[]) {
    this.log("info", args);
  }

  warn(...args: unknown[]) {
    this.log("warn", args);
  }

  error(...args: unknown[]) {
    this.log("error", args);
  }
}

export const logger = new Logger();
