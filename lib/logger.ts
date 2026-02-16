type LogMeta = Record<string, unknown>;

function serialize(meta?: LogMeta) {
  if (!meta) {
    return "";
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    console.log(`[INFO] ${message}${serialize(meta)}`);
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(`[WARN] ${message}${serialize(meta)}`);
  },
  error(message: string, meta?: LogMeta) {
    console.error(`[ERROR] ${message}${serialize(meta)}`);
  }
};
