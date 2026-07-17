import { Injectable, Logger } from '@nestjs/common';

/**
 * Structured application logger wrapping NestJS Logger.
 *
 * Replaces scattered `console.log` / `console.error` calls with
 * consistent, prefixed, leveled log entries.
 *
 * Usage:
 *   constructor(private readonly logger: AppLogger) {}
 *   this.logger.info('ChatGateway', 'User connected', { userId });
 *   this.logger.error('PresenceGateway', 'JWT verify failed', err);
 */
@Injectable()
export class AppLogger {
  private readonly nestLogger = new Logger('App');

  /** Informational message — replaces console.log */
  info(context: string, message: string, meta?: Record<string, unknown>): void {
    const formatted = meta ? `${message} | ${JSON.stringify(meta)}` : message;
    this.nestLogger.log(`[${context}] ${formatted}`);
  }

  /** Warning — replaces console.warn */
  warn(context: string, message: string, meta?: Record<string, unknown>): void {
    const formatted = meta ? `${message} | ${JSON.stringify(meta)}` : message;
    this.nestLogger.warn(`[${context}] ${formatted}`);
  }

  /** Error with optional exception — replaces console.error */
  error(context: string, message: string, error?: unknown): void {
    const errMessage = error instanceof Error ? error.message : String(error ?? '');
    this.nestLogger.error(`[${context}] ${message}${errMessage ? ` — ${errMessage}` : ''}`);
  }

  /** Debug — only visible in development */
  debug(context: string, message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = meta ? `${message} | ${JSON.stringify(meta)}` : message;
      this.nestLogger.debug(`[${context}] ${formatted}`);
    }
  }
}
