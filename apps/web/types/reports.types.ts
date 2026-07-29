import type { PaginatedResult } from './pagination.types';
import type { LocationType } from './users.types';

export type ReportType = 'voice' | 'text' | 'photo';
export type ReportStatus = 'received' | 'processing' | 'reviewed' | 'in_progress' | 'resolved';
export type ReportSentiment = 'positive' | 'neutral' | 'negative' | 'urgent';
export type ReportLanguage = 'en' | 'sw' | 'sheng';

export interface IReport {
  id: string;
  user_id: string | null;
  device_id: string | null;
  type: ReportType;
  content_text: string | null;
  media_url: string | null;
  language: string;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  summary: string | null;
  sentiment: ReportSentiment | null;
  urgency_score: number | null;
  confidence_score: number | null;
  is_spam: boolean;
  spam_score: number | null;
  duplicate_of: string | null;
  status: ReportStatus;
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;

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

export interface CreateTextReportDto {
  content_text: string;
  language?: ReportLanguage;
  location_type?: LocationType;
  location_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateMediaReportDto {
  caption?: string;
  location_type?: LocationType;
  location_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateReportStatusDto {
  status: ReportStatus;
}

export interface ReportQueryParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  category?: string;
  sentiment?: ReportSentiment;
  location_type?: LocationType;
  location_code?: string;
  county_code?: string;
  constituency_code?: string;
  q?: string;
  include_spam?: boolean;
}

export interface MyReportsQueryParams {
  page?: number;
  limit?: number;
}

export interface IReportsListResponse extends PaginatedResult<IReport> {}
