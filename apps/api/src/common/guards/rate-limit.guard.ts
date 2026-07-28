import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DevicesService } from 'src/modules/devices/devices.service';
import { AbuseLogsRepository } from 'src/modules/abuse-logs/abuse-logs.repository';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  SKIP_RATE_LIMIT_KEY,
} from '../decorators/rate-limit.decorator';

// ---------------------------------------------------------------------------
// In-memory IP sliding window
// Key: ip address  →  Value: array of request timestamps (ms)
// Entries are pruned lazily on each request from that IP, so memory stays
// bounded to active IPs × windowMs worth of timestamps.
// ---------------------------------------------------------------------------
const ipWindows = new Map<string, number[]>();

const DEFAULT_IP_MAX = 60;
const DEFAULT_DEVICE_MAX = 20;
const DEFAULT_WINDOW_MS = 60_000; // 1 minute

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly devicesService: DevicesService,
    private readonly abuseLogsRepo: AbuseLogsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // -----------------------------------------------------------------------
    // 1. Opt-out check
    // -----------------------------------------------------------------------
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? {};

    const ipMax = options.ipMax ?? DEFAULT_IP_MAX;
    const deviceMax = options.deviceMax ?? DEFAULT_DEVICE_MAX;
    const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    const windowMinutes = Math.ceil(windowMs / 60_000);

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.clientIp ?? req.ip ?? null;

    // -----------------------------------------------------------------------
    // 2. IP-level check (in-memory sliding window)
    // -----------------------------------------------------------------------
    if (ip) {
      const now = Date.now();
      const cutoff = now - windowMs;
      const timestamps = (ipWindows.get(ip) ?? []).filter((t) => t > cutoff);
      timestamps.push(now);
      ipWindows.set(ip, timestamps);

      if (timestamps.length > ipMax) {
        this.logger.warn(`IP rate limit exceeded: ${ip}`);
        throw new InternalServerErrorException(
          `Too many requests from your IP. Try again in a minute.`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // 3. Device-level check
    // Reads the same headers as the @DeviceId() decorator so this guard
    // works without requiring DevicesService.resolveDevice() to have run first.
    // -----------------------------------------------------------------------
    const clientUuid = req.headers['x-client-uuid'] as string | undefined;
    const fingerprintHash = req.headers['x-fingerprint-hash'] as string | undefined;

    if (clientUuid || fingerprintHash) {
      let deviceId: string | null = null;

      // Try to find the existing device — don't create one here, that's
      // the report/vote service's job.
      if (clientUuid) {
        const d = await this.devicesService.findByClientUuid(clientUuid);
        deviceId = d?.id ?? null;
      }

      if (!deviceId && fingerprintHash) {
        const d = await this.devicesService.findByFingerprint(fingerprintHash);
        deviceId = d?.id ?? null;
      }

      if (deviceId) {
        const recentCount = await this.devicesService.countRecentSubmissions(
          deviceId,
          windowMinutes,
        );

        if (recentCount >= deviceMax) {
          this.logger.warn(`Device rate limit exceeded: ${deviceId}`);

          // Log to abuse_logs so the dashboard and trust-score system see it.
          await this.abuseLogsRepo.log({
            report_id: null,
            device_id: deviceId,
            ip_address: ip,
            reason: 'rate_limit',
          });

          throw new InternalServerErrorException(
            `Submission limit reached. Please wait before submitting again.`,
          );
        }
      }
    }

    return true;
  }
}
