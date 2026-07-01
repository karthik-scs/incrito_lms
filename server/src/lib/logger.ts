type LogMeta = Record<string, unknown>;

function format(level: string, message: string, meta?: LogMeta) {
  const entry = { level, message, time: new Date().toISOString(), ...meta };
  return JSON.stringify(entry);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => console.log(format("info", message, meta)),
  warn: (message: string, meta?: LogMeta) => console.warn(format("warn", message, meta)),
  error: (message: string, meta?: LogMeta) => console.error(format("error", message, meta)),
};
