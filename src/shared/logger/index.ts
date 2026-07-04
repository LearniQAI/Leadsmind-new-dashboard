export const logger = {
  info: (msg: string, meta?: object) => console.log(msg, meta ?? ''),
  error: (msg: string, meta?: object) => console.error(msg, meta ?? ''),
  warn: (msg: string, meta?: object) => console.warn(msg, meta ?? ''),
};
