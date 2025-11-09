import { z } from 'zod';

/**
 * Zod schema for validating and typing environment variables.
 */
export const EnvSchema = z.object({
  HOST: z.string().default('localhost'),
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'provision'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  ALLOW_CORS_URL: z.string().url(),

  // JWT Configuration
  JWT_SECRET: z.string().min(10).max(128),
  JWT_REFRESH_SECRET: z.string().min(10).max(128),
  ACCESS_TOKEN_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),

  // Legacy token support (for backward compatibility)
  ACCESS_TOKEN_SECRET: z.string().min(10).max(128).optional(),
  REFRESH_TOKEN_SECRET: z.string().min(10).max(128).optional(),

  // Database Configuration (MySQL)
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SSL: z
    .string()
    .transform((value) => value === 'true')
    .optional(),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_TTL: z.coerce.number().default(300),

  // Mail Configuration
  MAIL_HOST: z.string().optional(),
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),

  // File System Configuration
  FILE_SYSTEM: z.enum(['s3', 'public']).default('public'),
  FILE_MAX_SIZE: z.coerce.number().default(20971520),
  AWS_REGION: z.string().default(''),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  AWS_S3_BUCKET_NAME: z.string().default(''),
  AWS_S3_ENDPOINT: z.string().default(''),
});

/**
 * Type representing validated environment variables.
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates a configuration object against the environment schema.
 *
 * @param {Record<string, unknown>} config - The configuration object to validate.
 * @returns {Env} The validated and typed environment variables.
 * @throws {Error} If validation fails.
 */
export const validateEnv = (config: Record<string, unknown>): Env => {
  const validate = EnvSchema.safeParse(config);
  if (!validate.success) {
    throw new Error(validate.error.message);
  }
  return validate.data;
};
