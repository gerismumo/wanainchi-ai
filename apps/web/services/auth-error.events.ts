// services/auth-error.events.ts
//
// Tiny event bus that lets .ts files (api handler, SWR fetchers, etc.)
// signal auth / API errors to the React layer without importing React.
//
// Usage in .ts files:
//   import { emitApiError } from './auth-error.events';
//   emitApiError({ title: 'Session expired', message: '...', type: 'auth' });
//
// Usage in .tsx files (mount once at app root):
//   import { useApiErrorListener } from './auth-error.events';
//   useApiErrorListener();   // inside a component

export type ApiErrorType = 'auth' | 'server' | 'network' | 'generic';

export interface ApiErrorPayload {
  title?: string;
  message: string;
  type?: ApiErrorType;
}

const API_ERROR_EVENT = 'crm:api-error';

/** Fire from any .ts file — no React import needed. */
export function emitApiError(payload: ApiErrorPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ApiErrorPayload>(API_ERROR_EVENT, { detail: payload }),
  );
}