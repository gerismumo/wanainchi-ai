import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { AiDigest, Report, Tables } from 'knex/types/tables';
import { buildPaginationMeta, PaginatedResult } from 'src/common/util/pagination.util';
import { LocationType } from 'src/database/types/knex-tables';

@Injectable()
export class DigestsRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async create(data: Tables['ai_digests']['insert']): Promise<AiDigest> {
    const [digest] = await this.knex('ai_digests').insert(data).returning('*');

    
    if(!digest) {
      throw new InternalServerErrorException()
    }

    return digest;
  }

  async findLatest(locationType: LocationType, locationCode: string): Promise<AiDigest | null> {
    const digest = await this.knex('ai_digests')
      .where({ location_type: locationType, location_code: locationCode })
      .orderBy('period_end', 'desc')
      .first();
    return digest ?? null;
  }

  async findById(id: string): Promise<AiDigest | null> {
    const digest = await this.knex('ai_digests').where({ id }).first();
    return digest ?? null;
  }

  async findPaginated(
    locationType: string | undefined,
    locationCode: string | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AiDigest>> {
    const applyFilters = (qb: Knex.QueryBuilder) => {
      if (locationType) qb.andWhere('location_type', locationType);
      if (locationCode) qb.andWhere('location_code', locationCode);
    };

    const totalResult = await this.knex('ai_digests').modify(applyFilters).count('id as count').first();
    const total = Number((totalResult as { count?: string })?.count ?? 0);

    const items = await this.knex('ai_digests')
      .modify(applyFilters)
      .orderBy('period_end', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async getReportsForPeriod(
    locationType: string,
    locationCode: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<Pick<Report, 'category' | 'summary' | 'content_text' | 'urgency_score'>[]> {
    return this.knex('reports')
      .select('category', 'summary', 'content_text', 'urgency_score')
      .where('location_type', locationType)
      .andWhere('location_code', locationCode)
      .andWhere('is_spam', false)
      .andWhereBetween('created_at', [periodStart, periodEnd]);
  }
}
