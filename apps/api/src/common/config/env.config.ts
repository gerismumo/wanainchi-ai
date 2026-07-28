import * as path from 'path';
import * as dotenv from 'dotenv';
import { EnvConfig, NodeEnv } from './env.types';

function loadEnv() {
  const envFiles = ['.env', `.env.prodution`, `.env.development`, '.env.local'];

  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '../../../', file);

    const result = dotenv.config({
      path: fullPath,
      override: false,
    });

    if (result.error) {
      console.warn(`[env] Not loaded: ${fullPath}`);
    } else {
      console.log(`[env] Loaded: ${fullPath}`);
    }
  }
}

loadEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  switch (value) {
    case NodeEnv.DEVELOPMENT:
    case NodeEnv.PRODUCTION:
    case NodeEnv.TEST:
      return value;
    default:
      throw new Error(
        `Invalid NODE_ENV: ${value}. Must be one of: development | production | test`,
      );
  }
}

export const ENV: EnvConfig = {
  HOST_NAME: process.env.HOST_NAME || 'localhost',

  PORT: parseInt(required('PORT'), 10),

  BASE_URL:
    process.env.BASE_URL ||
    `http://${process.env.HOST_NAME || 'localhost'}:${process.env.PORT}`,

  FRONTEND_URL: required('FRONTEND_URL'),

  NODE_ENV: parseNodeEnv(required('NODE_ENV')),

  DB_HOST: required('DB_HOST'),
  DB_USER: required('DB_USER'),
  DB_PASSWORD: required('DB_PASSWORD'),
  DB_PORT: Number(required('DB_PORT')),

  DB_NAME_PROD: required('DB_NAME_PROD'),
  DB_NAME_TEST: process.env.DB_NAME_TEST,
  DB_NAME_DEV: process.env.DB_NAME_DEV,

  ADMIN_FIRST_NAME: process.env.ADMIN_FIRST_NAME,
  ADMIN_LAST_NAME: process.env.ADMIN_LAST_NAME,
  ADMIN_EMAIL: required('ADMIN_EMAIL'),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_PHONE: process.env.ADMIN_PHONE,

  MINIO_ENDPOINT: required('MINIO_ENDPOINT'),
  MINIO_PORT: Number(required('MINIO_PORT')),
  MINIO_USESSL: (process.env.MINIO_USESSL ?? 'false').toLowerCase() === 'true',
  MINIO_ACCESSKEY: required('MINIO_ACCESSKEY'),
  MINIO_SECRETKEY: required('MINIO_SECRETKEY'),
  MINIO_PUBLIC_URL: required('MINIO_PUBLIC_URL'),
  MINIO_BUCKET: required('MINIO_BUCKET'),
  MINIO_BUCKET_DEV: required('MINIO_BUCKET_DEV'),
  JWT_SECRET: required('JWT_SECRET'),
  // EVIDENCE_SECRET_KEY: required('EVIDENCE_SECRET_KEY'),
  SMTP_HOST: required('SMTP_HOST'),
  SMTP_PORT: Number(required('SMTP_PORT')),
  SMTP_USER: required('SMTP_USER'),
  SMTP_PASS: required('SMTP_PASS'),
  SMTP_SECURE: (process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
  RESEND_API_KEY: required('RESEND_API_KEY'),
  RESEND_FROM_EMAIL: required('RESEND_FROM_EMAIL'),
  GEMINI_API_KEY:required('GEMINI_API_KEY'),
  CORS_ORIGINS: required('CORS_ORIGINS'),
  CORS_REGEX_ORIGINS: required('CORS_REGEX_ORIGINS'),
  CORS_DEV_ORIGINS: process.env.CORS_DEV_ORIGINS,
} as const;
