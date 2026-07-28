export enum NodeEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export type EnvConfig = {
  HOST_NAME: string;
  PORT: number;
  BASE_URL: string;
  FRONTEND_URL: string;

  NODE_ENV: NodeEnv;

  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_PORT: number;

  DB_NAME_PROD: string;
  DB_NAME_TEST?: string;
  DB_NAME_DEV?: string;

  ADMIN_FIRST_NAME?: string;
  ADMIN_LAST_NAME?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_PHONE?: string;

  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_USESSL: boolean;
  MINIO_ACCESSKEY: string;
  MINIO_SECRETKEY: string;
  MINIO_PUBLIC_URL: string;
  MINIO_BUCKET: string;
  MINIO_BUCKET_DEV: string;

  RESEND_API_KEY?:string;
  RESEND_FROM_EMAIL?:string;

  JWT_SECRET?: string;

  GEMINI_API_KEY:string;

  CORS_ORIGINS: string;
  CORS_REGEX_ORIGINS: string;
  CORS_DEV_ORIGINS?: string;
};
