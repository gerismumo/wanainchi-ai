import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { Report } from 'knex/types/tables';
import {
  buildPaginationMeta,
  PaginatedResult,
} from 'src/common/util/pagination.util';
import { ReportFilters, ReportWithCounts } from './types/report.types';

@Injectable()
export class ReportsRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async create(
    data: Partial<Report> & { type: Report['type'] },
  ): Promise<Report> {
    const [report] = await this.knex('reports').insert(data).returning('*');

    if (!report) {
      throw new InternalServerErrorException();
    }

    return report;
  }

  async findById(id: string): Promise<ReportWithCounts | null> {
    const report = await this.withCountsQuery()
      .where('r.id', id)
      .groupBy('r.id')
      .first();
    return report ?? null;
  }

  async updateAiFields(
    id: string,
    data: Partial<Report>,
  ): Promise<Report | null> {
    const [report] = await this.knex('reports')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return report ?? null;
  }

  async updateStatus(
    id: string,
    status: Report['status'],
  ): Promise<Report | null> {
    const [report] = await this.knex('reports')
      .where({ id })
      .update({ status, updated_at: new Date() })
      .returning('*');
    return report ?? null;
  }

  async markDuplicate(id: string, duplicateOfId: string): Promise<void> {
    await this.knex('reports')
      .where({ id })
      .update({
        duplicate_of: duplicateOfId,
        status: 'reviewed',
        updated_at: new Date(),
      });
  }

  async findRecentCandidatesForDuplicate(
    category: string,
    locationCode: string | null,
    excludeId: string,
    withinHours = 72,
  ): Promise<Pick<Report, 'id' | 'summary' | 'content_text'>[]> {
    return this.knex('reports')
      .select('id', 'summary', 'content_text')
      .where('category', category)
      .andWhere('id', '!=', excludeId)
      .andWhere('is_spam', false)
      .modify((qb) => {
        if (locationCode) qb.andWhere('location_code', locationCode);
      })
      .andWhere(
        'created_at',
        '>',
        this.knex.raw(`now() - interval '${withinHours} hours'`),
      )
      .orderBy('created_at', 'desc')
      .limit(10);
  }

  async findPaginated(
    filters: ReportFilters,
  ): Promise<PaginatedResult<ReportWithCounts>> {
    const {
      page,
      limit,
      status,
      category,
      sentiment,
      locationType,
      locationCode,
      countyCode,
      constituencyCode,
      q,
      includeSpam,
    } = filters;

    const applyFilters = (qb: Knex.QueryBuilder) => {
      if (!includeSpam) qb.andWhere('r.is_spam', false);
      if (status) qb.andWhere('r.status', status);
      if (category) qb.andWhere('r.category', category);
      if (sentiment) qb.andWhere('r.sentiment', sentiment);
      if (locationType) qb.andWhere('r.location_type', locationType);
      if (locationCode) qb.andWhere('r.location_code', locationCode);
      if (countyCode) qb.andWhere('r.county_code', countyCode);
      if (constituencyCode)
        qb.andWhere('r.constituency_code', constituencyCode);
      if (q) {
        qb.andWhere((sub) => {
          sub
            .whereILike('r.content_text', `%${q}%`)
            .orWhereILike('r.summary', `%${q}%`);
        });
      }
    };

    const totalResult = await this.knex('reports as r')
      .modify(applyFilters)
      .count('r.id as count')
      .first();
    const total = Number((totalResult as { count?: string })?.count ?? 0);

    const items = await this.withCountsQuery()
      .modify(applyFilters)
      .groupBy('r.id')
      .orderBy('r.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findByDevice(
    deviceId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ReportWithCounts>> {
    const totalResult = await this.knex('reports')
      .where({ device_id: deviceId })
      .count('id as count')
      .first();
    const total = Number((totalResult as { count?: string })?.count ?? 0);

    const items = await this.withCountsQuery()
      .where('r.device_id', deviceId)
      .groupBy('r.id')
      .orderBy('r.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  private withCountsQuery() {
    return this.knex('reports as r')
      .select(
        'r.*',
        this.knex.raw('count(distinct v.id) as vote_count'),
      )
      .leftJoin('votes as v', 'v.report_id', 'r.id')
  }
}
