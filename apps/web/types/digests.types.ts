import type { PaginatedResult } from './pagination.types';
import type { LocationType } from './users.types';

export interface DigestTopIssue {
  category: string;
  count: number;
  avg_urgency: number;
}

export interface IAiDigest {
  id: string;
  period_start: string;
  period_end: string;
  summary_text: string;
  top_issues: DigestTopIssue[] | null;
  report_count: number;
  created_at: string;

  location_type: LocationType | null;
  location_code: string | null;
  location_name: string | null;
  county_code: string | null;
  county_name: string | null;
  constituency_code: string | null;
  constituency_name: string | null;
  locality_code: string | null;
  locality_name: string | null;
}

export interface GenerateDigestDto {
  location_type: LocationType;
  location_code: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
}

export interface DigestQueryParams {
  location_type?: LocationType;
  location_code?: string;
  page?: number;
  limit?: number;
}

export interface LatestDigestQueryParams {
  location_type: LocationType;
  location_code: string;
}

export interface IDigestsListResponse extends PaginatedResult<IAiDigest> {}
