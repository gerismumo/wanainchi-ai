import axios from 'axios';
import { getClientUuid } from '../../lib/device-identity';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const ClientHttp = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Attach the anonymous device UUID to every request so the server can link
 * reports and votes submitted by the same device without requiring a login.
 *
 * `getClientUuid()` generates the UUID on first call and persists it in
 * localStorage.  It returns null during SSR, in which case the header is
 * omitted and the server treats the submission as fully anonymous.
 */
ClientHttp.interceptors.request.use((config) => {
  const uuid = getClientUuid();

  if (uuid) {
    config.headers['x-client-uuid'] = uuid;
  }

  return config;
});
