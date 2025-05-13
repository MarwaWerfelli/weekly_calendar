// src/config/logger.ts

import pino from 'pino';
import { env } from './env';

// Configure logger based on environment
const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    env: env.NODE_ENV,
  },
});

export default logger;
