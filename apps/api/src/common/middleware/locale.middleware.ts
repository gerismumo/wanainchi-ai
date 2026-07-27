import { Request, Response, NextFunction } from 'express';

interface GeoData {
  city?: string;
  lat?: number;
  lon?: number;
}

async function fetchGeo(ip: string): Promise<GeoData> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,lat,lon`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function localeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const cfIP = req.headers['cf-connecting-ip'];
  const realIP = req.headers['x-real-ip'];
  const forwardedFor = req.headers['x-forwarded-for'];

  const ipAddress =
    (Array.isArray(cfIP) ? cfIP[0] : cfIP) ||
    (Array.isArray(realIP) ? realIP[0] : realIP) ||
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]) ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  req.clientIp = ipAddress;
  req.clientCountry = (req.headers['cf-ipcountry'] as string) || 'KE';

  // Skip geo lookup for localhost
  const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ipAddress);
  if (!isLocal) {
    const geo = await fetchGeo(ipAddress);
    req.clientCity = geo.city ;
    req.clientLatitude = geo.lat;
    req.clientLongitude = geo.lon;
  }

  next();
}