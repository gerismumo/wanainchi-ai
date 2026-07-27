import 'express';
import 'multer';

declare global {
  namespace Express {
    interface Request {
      clientCountry?: string;
      clientIp?: string;
      clientCity?: string;
      clientLatitude?: number;
      clientLongitude?: number;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        roles: string[];
      };
    }

    interface Response {
      success<T>(data: T, message?: string, statusCode?: number): void;
      fail(message: string, statusCode?: number): void;
    }
  }
}

export {};