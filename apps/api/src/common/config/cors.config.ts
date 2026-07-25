import { ENV } from './env.config';

export function getAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [];

  // exact origins
  if (ENV.CORS_ORIGINS) {
    origins.push(
      ...ENV.CORS_ORIGINS.split(',').map((o) => o.trim()),
    );
  }

  // regex origins
  if (ENV.CORS_REGEX_ORIGINS) {
    origins.push(
      ...ENV.CORS_REGEX_ORIGINS.split(',').map(
        (r) => new RegExp(r.trim()),
      ),
    );
  }

  // development origins
  if (ENV.CORS_DEV_ORIGINS) {
    origins.push(
      ...ENV.CORS_DEV_ORIGINS.split(',').map((o) => o.trim()),
    );
  }

  return origins;
}

export function corsOriginValidator(
  allowedOrigins: (string | RegExp)[],
) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // allow requests without origin (mobile apps, postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp
        ? allowed.test(origin)
        : allowed === origin,
    );

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`CORS blocked: ${origin}`);

    return callback(new Error('Not authorized by CORS'));
  };
}