import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, colorize, printf, errors } = format;

// ── Console format ────────────────────────────────────────────────────────────
// e.g.  2025-04-15 14:32:01 [INFO]  [users.controller] listUsers called

const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return stack
    ? `${ts} [${level.toUpperCase()}]  ${message}\n${stack}`
    : `${ts} [${level.toUpperCase()}]  ${message}`;
});

// ── Logger instance ───────────────────────────────────────────────────────────

const logger = createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),

  transports: [
    // Console — colorized in development, plain JSON in production
    process.env.NODE_ENV === 'production'
      ? new transports.Console({ format: format.json() })
      : new transports.Console({
          format: combine(colorize({ all: true }), consoleFormat),
        }),

    // Persistent error log — always written regardless of environment
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: format.json(),
      maxsize: 5 * 1024 * 1024,  // 5 MB
      maxFiles: 3,
    }),
  ],

  // Prevent Winston from throwing when the logs/ directory doesn't exist yet
  exceptionHandlers: [
    new transports.Console({ format: combine(colorize({ all: true }), consoleFormat) }),
  ],
  rejectionHandlers: [
    new transports.Console({ format: combine(colorize({ all: true }), consoleFormat) }),
  ],
  exitOnError: false,
});

export default logger;
