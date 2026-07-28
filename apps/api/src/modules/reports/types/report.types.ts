import { Report } from 'knex/types/tables';

export interface ReportWithCounts extends Report {
  vote_count?: string;
  comment_count?: string;
}

export interface ReportPublic extends Omit<Report, 'embedding_id' | 'urgency_score' | 'confidence_score' | 'spam_score'> {
  urgency_score: number | null;
  confidence_score: number | null;
  spam_score: number | null;
  vote_count: number;
  comment_count: number;
}

export interface ReportFilters {
  page: number;
  limit: number;
  status?: Report['status'];
  category?: string;
  sentiment?: Report['sentiment'];
  locationType?: string;
  locationCode?: string;
  countyCode?: string;
  constituencyCode?: string;
  q?: string;
  includeSpam?: boolean;
}
