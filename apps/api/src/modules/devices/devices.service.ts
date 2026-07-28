import { Injectable } from '@nestjs/common';
import { Device } from 'knex/types/tables';
import { DevicesRepository } from './devices.repository';

export interface DeviceContext {
  clientUuid?: string;
  fingerprintHash?: string;
}

@Injectable()
export class DevicesService {
  constructor(private readonly repo: DevicesRepository) {}

  /**
   * Finds the device behind a request, creating one if this is the first
   * time we've seen it. client_uuid (frontend-persisted) is tried first,
   * falling back to fingerprint_hash if storage was cleared. Never requires
   * a login — this is the anonymous identity backbone for the whole app.
   */
  async resolveDevice(
    ctx: DeviceContext,
    ip: string | null,
    userAgent: string | null,
  ): Promise<Device> {
    let device: Device | null = null;

    if (ctx.clientUuid) {
      device = await this.repo.findByClientUuid(ctx.clientUuid);
    }

    if (!device && ctx.fingerprintHash) {
      device = await this.repo.findByFingerprint(ctx.fingerprintHash);
    }

    if (!device) {
      return this.repo.create({
        client_uuid: ctx.clientUuid ?? null,
        fingerprint_hash: ctx.fingerprintHash ?? null,
        last_ip: ip,
        user_agent: userAgent,
      });
    }

    return this.repo.touch(device.id, { last_ip: ip, user_agent: userAgent });
  }

  async countRecentSubmissions(deviceId: string, sinceMinutes = 60): Promise<number> {
    return this.repo.countRecentSubmissions(deviceId, sinceMinutes);
  }

  async linkToUser(deviceId: string, userId: string): Promise<void> {
    await this.repo.linkToUser(deviceId, userId);
  }

  async penalize(deviceId: string, amount = 0.05): Promise<void> {
    await this.repo.adjustTrust(deviceId, -amount);
  }

  async reward(deviceId: string, amount = 0.01): Promise<void> {
    await this.repo.adjustTrust(deviceId, amount);
  }
}
