import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Base logger configuration
export const logger = pino({
  level: logLevel,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
  // Production: structured JSON logs
  ...(!isDevelopment && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  }),
});

/**
 * Create a child logger with module context
 * @param module - Module name (e.g., 'auth', 'db', 'api')
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

// Export convenience loggers for common modules
export const authLogger = createLogger('auth');
export const dbLogger = createLogger('db');
export const apiLogger = createLogger('api');
export const pageLogger = createLogger('page');
export const componentLogger = createLogger('component');
export const migrationLogger = createLogger('migration');
export const pushLogger = createLogger('push');
