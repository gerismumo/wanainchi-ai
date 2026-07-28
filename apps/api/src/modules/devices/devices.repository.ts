import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { Device } from 'knex/types/tables';

@Injectable()
export class DevicesRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async findByClientUuid(clientUuid: string): Promise<Device | null> {
    const device = await this.knex('devices')
      .where({ client_uuid: clientUuid })
      .first();
    return device ?? null;
  }

  async findByFingerprint(fingerprintHash: string): Promise<Device | null> {
    const device = await this.knex('devices')
      .where({ fingerprint_hash: fingerprintHash })
      .first();
    return device ?? null;
  }

  async findById(id: string): Promise<Device | null> {
    const device = await this.knex('devices').where({ id }).first();
    return device ?? null;
  }

  async create(data: {
    client_uuid?: string | null;
    fingerprint_hash?: string | null;
    last_ip?: string | null;
    user_agent?: string | null;
  }): Promise<Device> {
    const [device] = await this.knex('devices')
      .insert({ ...data, submission_count: 1 })
      .returning('*');

    if (!device) {
      throw new InternalServerErrorException();
    }

    return device;
  }

  async touch(
    id: string,
    data: { last_ip?: string | null; user_agent?: string | null },
  ): Promise<Device> {
    const [device] = await this.knex('devices')
      .where({ id })
      .update({
        ...data,
        last_seen_at: new Date(),
        submission_count: this.knex.raw(
          'submission_count + 1',
        ) as unknown as number,
      })
      .returning('*');

    if (!device) {
      throw new InternalServerErrorException();
    }

    return device;
  }

  async linkToUser(deviceId: string, userId: string): Promise<void> {
    await this.knex('devices')
      .where({ id: deviceId })
      .update({ linked_user_id: userId });
  }

  async adjustTrust(deviceId: string, delta: number): Promise<void> {
    await this.knex('devices')
      .where({ id: deviceId })
      .update({
        trust_score: this.knex.raw('GREATEST(0, LEAST(1, trust_score + ?))', [
          delta,
        ]) as unknown as string,
      });
  }

  async countRecentSubmissions(
    deviceId: string,
    sinceMinutes: number,
  ): Promise<number> {
    const result = await this.knex('reports')
      .where({ device_id: deviceId })
      .andWhere(
        'created_at',
        '>',
        this.knex.raw(`now() - interval '${sinceMinutes} minutes'`),
      )
      .count('* as count')
      .first();

    return Number((result as { count?: string })?.count ?? 0);
  }
}
