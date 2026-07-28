import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { Vote } from 'knex/types/tables';

@Injectable()
export class VotesRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async findExisting(
    reportId: string,
    userId: string | null,
    deviceId: string | null,
  ): Promise<Vote | null> {
    const query = this.knex('votes').where({ report_id: reportId });

    const vote = userId
      ? await query.andWhere({ user_id: userId }).first()
      : await query.andWhere({ device_id: deviceId }).first();

    return vote ?? null;
  }

  async create(
    reportId: string,
    userId: string | null,
    deviceId: string | null,
  ): Promise<Vote> {
    const [vote] = await this.knex('votes')
      .insert({ report_id: reportId, user_id: userId, device_id: deviceId })
      .returning('*');

    if (!vote) {
      throw new InternalServerErrorException();
    }

    return vote;
  }

  async remove(id: string): Promise<void> {
    await this.knex('votes').where({ id }).del();
  }

  async countForReport(reportId: string): Promise<number> {
    const result = await this.knex('votes')
      .where({ report_id: reportId })
      .count('id as count')
      .first();
    return Number((result as { count?: string })?.count ?? 0);
  }
}
