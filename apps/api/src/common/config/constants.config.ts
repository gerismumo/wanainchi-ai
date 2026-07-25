import { ENV } from './env.config';

export const APP_CONSTANTS = {
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  USERS: {
    DEFAULT_ROLE: 'user',
  },
  MAX_FAILED_ATTEMPTS: 10,
};

export const jwtConstants = {
  secret: ENV.JWT_SECRET!,
};
