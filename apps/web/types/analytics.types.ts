import type { LocationType } from './users.types';

export interface AnalyticsOverview {
  totalReports: number;
  resolvedReports: number;
  activeCounties: number;
  spamReports: number;
}

export interface LocationSummary {
  location_type: LocationType;
  location_code: string;
  location_name: string | null;
  county_code: string | null;
  county_name: string | null;
  constituency_code: string | null;
  total_reports: number;
  resolved_count: number;
  avg_urgency: number | null;
}

export interface CountySummary {
  county_code: string;
  county_name: string | null;
  total_reports: number;
  resolved_count: number;
  avg_urgency: number | null;
}

export interface TopCategory {
  category: string;
  report_count: number;
  avg_urgency: number | null;
}

export interface ReturningDevice {
  device_id: string;
  linked_user_id: string | null;
  trust_score: number;
  total_submissions: number;
  first_submission_at: string;
  last_submission_at: string;
}
