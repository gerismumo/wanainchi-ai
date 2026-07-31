import { Injectable } from '@nestjs/common';
import { ReportPublic, ReportWithCounts } from './types/report.types';

@Injectable()
export class ReportsMapper {
  toPublic(report: ReportWithCounts): ReportPublic {
    const { embedding_id, vote_count, ...rest } = report;

    const confidenceScore = report.confidence_score
      ? parseFloat(report.confidence_score)
      : null;

    return {
      ...rest,
      urgency_score: report.urgency_score ? parseFloat(report.urgency_score) : null,
      confidence_score: confidenceScore,
      spam_score: report.spam_score ? parseFloat(report.spam_score) : null,
      vote_count: vote_count ? Number(vote_count) : 0,
      comment_count: 0,
      // confidence_score is set to 0 in every AI-failure fallback branch,
      // so > 0 reliably means Gemma actually ran and returned a result.
      ai_enriched: confidenceScore !== null && confidenceScore > 0,
    };
  }

  toPublicList(reports: ReportWithCounts[]): ReportPublic[] {
    return reports.map((r) => this.toPublic(r));
  }
}
