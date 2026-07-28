export type ReportCategory =
  | 'water'
  | 'roads'
  | 'electricity'
  | 'health'
  | 'education'
  | 'security'
  | 'environment'
  | 'agriculture'
  | 'governance'
  | 'other';

export const REPORT_CATEGORIES: ReportCategory[] = [
  'water',
  'roads',
  'electricity',
  'health',
  'education',
  'security',
  'environment',
  'agriculture',
  'governance',
  'other',
];

export type ReportSentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

export type DetectedLanguage = 'en' | 'sw' | 'sheng' | 'other';

export type LocationLevelGuess = 'county' | 'constituency' | 'ward' | 'locality' | 'area' | null;

/**
 * A place name Gemma pulled out of free text (or a photo's visible
 * signage/context), with a best-effort guess at its administrative level.
 * The backend resolves this against ke-locations-data by name — it's a
 * fallback for when the citizen never picked a location on a map/dropdown,
 * so an explicit client-supplied location_type/location_code always wins
 * over this when both are present.
 */
export interface MentionedLocation {
  name: string;
  levelGuess: LocationLevelGuess;
}

export interface AiTextAnalysis {
  /** English translation, or null if the report was already in English. */
  translatedText: string | null;
  detectedLanguage: DetectedLanguage;
  category: ReportCategory;
  /** Max ~2 sentence English summary, used for dashboards and dedupe. */
  summary: string;
  sentiment: ReportSentiment;
  urgencyScore: number; // 0-1
  confidenceScore: number; // 0-1
  isSpam: boolean;
  spamScore: number; // 0-1
  mentionedLocation: MentionedLocation | null;
}

export interface AiTranscriptionResult {
  transcript: string;
  detectedLanguage: DetectedLanguage;
  mentionedLocation: MentionedLocation | null;
}

export interface AiImageAnalysis {
  description: string;
  category: ReportCategory;
  hasVisibleIssue: boolean;
  isSpam: boolean;
  spamScore: number; // 0-1
  mentionedLocation: MentionedLocation | null;
}

export interface AiDigestTopIssue {
  category: string;
  count: number;
  avgUrgency: number;
}

export interface AiDigestSummary {
  summaryText: string;
  topIssues: AiDigestTopIssue[];
}