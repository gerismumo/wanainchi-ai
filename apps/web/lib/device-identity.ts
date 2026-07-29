/**
 * Stable anonymous device identity — stored as a long-lived cookie.
 *
 * On first call a random UUID is generated and written to a cookie named
 * `x-client-uuid` with a 2-year expiry.  Every subsequent call returns the
 * same value until the user clears their cookies.
 *
 * Using a cookie (instead of localStorage) means the value survives across
 * tabs and is also available to Next.js middleware / server components via
 * `cookies()` from `next/headers` if needed in the future.
 *
 * The Axios interceptor reads this value and attaches it as the
 * `x-client-uuid` request header so the NestJS `@DeviceId()` decorator
 * can link anonymous reports and votes to the same device.
 */

const COOKIE_NAME = 'x-client-uuid';
/** 2 years in seconds */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // RFC 4122 v4 fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split('=')[1]!) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;

  // SameSite=Lax is safe for a device-identity cookie — no need for Secure
  // during local dev, and Lax still protects against CSRF.
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `max-age=${maxAge}`,
    'path=/',
    'SameSite=Lax',
  ].join('; ');
}

/**
 * Returns the persisted client UUID, creating and storing one if it doesn't
 * exist yet.  Returns `null` during SSR (no `document` available).
 */
export function getClientUuid(): string | null {
  if (typeof document === 'undefined') return null;

  let uuid = getCookie(COOKIE_NAME);

  if (!uuid) {
    uuid = generateUUID();
    setCookie(COOKIE_NAME, uuid, COOKIE_MAX_AGE);
  }

  return uuid;
}

/**
 * Clears the device UUID cookie.
 * Call on logout if post-logout submissions should be treated as a new device.
 */
export function clearClientUuid(): void {
  if (typeof document === 'undefined') return;

  // Overwrite with an expired cookie to delete it
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
}
