import winston, { format } from "winston";

const { combine, errors, json, timestamp } = format;

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";

    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}${metaStr}`
      : `[${timestamp}] ${level}: ${message}${metaStr}`;
  }),
);

export const DbLogger = winston.createLogger({
  level: "info",
  format: combine(
    errors({ stack: true }),
    timestamp({
      format: "YYYY-MM-DD hh:mm:ss.SSS A",
    }),
    json(),
  ),
  defaultMeta: { service: "database" },
  transports: [
    new winston.transports.Console({ level: "error", format: consoleFormat }),
    new winston.transports.File({ dirname: "logs", filename: "database.log" }),
  ],
});

export const RouteLogger = winston.createLogger({
  level: "debug",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS A" }),
    json(),
  ),
  defaultMeta: { service: "route" },
  transports: [
    new winston.transports.Console({ level: "error", format: consoleFormat }),
    new winston.transports.File({ dirname: "logs", filename: "routes.log" }),
  ],
});
