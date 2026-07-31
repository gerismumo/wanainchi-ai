import { Injectable } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { DiscoveredCategory } from './category-discovery.types';

@Injectable()
export class CategoryDiscoveryRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async findBySlug(slug: string): Promise<DiscoveredCategory | null> {
    const row = await this.knex('discovered_categories').where({ slug }).first();
    return row ?? null;
  }

  async findAllActive(): Promise<DiscoveredCategory[]> {
    return this.knex('discovered_categories').where({ is_active: true }).orderBy('report_count', 'desc');
  }

  async findAll(): Promise<DiscoveredCategory[]> {
    return this.knex('discovered_categories').orderBy('report_count', 'desc');
  }

  async create(slug: string, label: string): Promise<DiscoveredCategory> {
    const [row] = await this.knex('discovered_categories')
      .insert({ slug, label, report_count: 1 })
      .returning('*');
    return row;
  }

  async incrementAndMaybeActivate(slug: string, promotionThreshold: number): Promise<DiscoveredCategory> {
    const [row] = await this.knex('discovered_categories')
      .where({ slug })
      .update({
        report_count: this.knex.raw('report_count + 1') as unknown as number,
        last_seen_at: new Date(),
        is_active: this.knex.raw('(report_count + 1) >= ?', [promotionThreshold]) as unknown as boolean,
      })
      .returning('*');
    return row;
  }
}
