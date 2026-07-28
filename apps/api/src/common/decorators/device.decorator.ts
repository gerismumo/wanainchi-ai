import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DeviceContext } from '../../modules/devices/devices.service';

/**
 * Pulls the anonymous device identity off the request headers.
 * The frontend is expected to generate and persist `client_uuid` itself
 * (cookie/localStorage) and send it on every submission; `fingerprint_hash`
 * is an optional fallback signal for when storage was cleared but the
 * physical device is the same.
 */
export const DeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DeviceContext => {
    const req = ctx.switchToHttp().getRequest();

    return {
      clientUuid: (req.headers['x-client-uuid'] as string) || undefined,
      fingerprintHash: (req.headers['x-fingerprint-hash'] as string) || undefined,
    };
  },
);
