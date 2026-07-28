import { Injectable } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { AbuseLog } from 'knex/types/tables';

@Injectable()
export class AbuseLogsRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async log(data: {
    report_id: string | null;
    device_id: string | null;
    ip_address: string | null;
    reason: AbuseLog['reason'];
  }): Promise<void> {
    await this.knex('abuse_logs').insert(data);
  }

  async countForDevice(
    deviceId: string,
    reason: AbuseLog['reason'],
    sinceHours = 24,
  ): Promise<number> {
    const result = await this.knex('abuse_logs')
      .where({ device_id: deviceId, reason })
      .andWhere('created_at', '>', this.knex.raw(`now() - interval '${sinceHours} hours'`))
      .count('id as count')
      .first();

    return Number((result as { count?: string })?.count ?? 0);
  }
}
