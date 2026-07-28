import { Injectable } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';

@Injectable()
export class AnalyticsRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async getLocationSummary(locationType?: string) {
    return this.knex('v_location_summary')
      .modify((qb) => {
        if (locationType) qb.where('location_type', locationType);
      })
      .orderBy('total_reports', 'desc');
  }

  async getCountySummary() {
    return this.knex('v_county_summary').orderBy('total_reports', 'desc');
  }

  async getTopCategories(limit = 10) {
    return this.knex('v_top_categories').limit(limit);
  }

  async getReturningDevices(limit = 50) {
    return this.knex('v_returning_devices').orderBy('total_submissions', 'desc').limit(limit);
  }

  async getOverview() {
    const [totalReports, resolvedReports, activeCounties, spamReports] = await Promise.all([
      this.knex('reports').where({ is_spam: false }).count('id as count').first(),
      this.knex('reports').where({ is_spam: false, status: 'resolved' }).count('id as count').first(),
      this.knex('reports').where({ is_spam: false }).countDistinct('county_code as count').first(),
      this.knex('reports').where({ is_spam: true }).count('id as count').first(),
    ]);

    return {
      totalReports: Number((totalReports as { count?: string })?.count ?? 0),
      resolvedReports: Number((resolvedReports as { count?: string })?.count ?? 0),
      activeCounties: Number((activeCounties as { count?: string })?.count ?? 0),
      spamReports: Number((spamReports as { count?: string })?.count ?? 0),
    };
  }
}
