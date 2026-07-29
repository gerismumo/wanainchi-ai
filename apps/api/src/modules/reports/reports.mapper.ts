import { Injectable } from '@nestjs/common';
import { ReportPublic, ReportWithCounts } from './types/report.types';

@Injectable()
export class ReportsMapper {
  toPublic(report: ReportWithCounts): ReportPublic {
    const { embedding_id, vote_count, ...rest } = report;

    return {
      ...rest,
      urgency_score: report.urgency_score ? parseFloat(report.urgency_score) : null,
      confidence_score: report.confidence_score ? parseFloat(report.confidence_score) : null,
      spam_score: report.spam_score ? parseFloat(report.spam_score) : null,
      vote_count: vote_count ? Number(vote_count) : 0,
      comment_count: 0,
    };
  }

  toPublicList(reports: ReportWithCounts[]): ReportPublic[] {
    return reports.map((r) => this.toPublic(r));
  }
}
