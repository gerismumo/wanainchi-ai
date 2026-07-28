import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  async getLocationSummary(locationType?: string) {
    const rows = await this.repo.getLocationSummary(locationType);
    return rows.map((r) => ({
      ...r,
      total_reports: Number(r.total_reports),
      resolved_count: Number(r.resolved_count),
      avg_urgency: r.avg_urgency ? parseFloat(r.avg_urgency) : null,
    }));
  }

  async getCountySummary() {
    const rows = await this.repo.getCountySummary();
    return rows.map((r) => ({
      ...r,
      total_reports: Number(r.total_reports),
      resolved_count: Number(r.resolved_count),
      avg_urgency: r.avg_urgency ? parseFloat(r.avg_urgency) : null,
    }));
  }

  async getTopCategories() {
    const rows = await this.repo.getTopCategories();
    return rows.map((r) => ({
      ...r,
      report_count: Number(r.report_count),
      avg_urgency: r.avg_urgency ? parseFloat(r.avg_urgency) : null,
    }));
  }

  async getReturningDevices() {
    const rows = await this.repo.getReturningDevices();
    return rows.map((r) => ({
      ...r,
      trust_score: parseFloat(r.trust_score),
      total_submissions: Number(r.total_submissions),
    }));
  }

  async getOverview() {
    return this.repo.getOverview();
  }
}
