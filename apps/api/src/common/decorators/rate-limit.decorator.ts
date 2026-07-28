import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';

export interface RateLimitOptions {
  /** Max requests per windowMs from the same IP. Default: 60 */
  ipMax?: number;
  /** Max requests per windowMs from the same device. Default: 20 */
  deviceMax?: number;
  /** Window in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
}

/**
 * Override the default rate-limit thresholds for a specific route or controller.
 *
 * @example
 * @RateLimit({ deviceMax: 5, windowMs: 60_000 })   // 5 submissions/min per device
 * @Post('text')
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Disable rate limiting entirely for a route or controller
 * (use for health checks, auth callbacks, etc.)
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
