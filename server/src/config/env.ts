// src/config/env.ts

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define env schema for validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

// Parse environment variables
const envResult = envSchema.safeParse(process.env);

// Handle validation errors
if (!envResult.success) {
  console.error('❌ Invalid environment variables:', envResult.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

// Export typed and validated environment variables
export const env = envResult.data;
