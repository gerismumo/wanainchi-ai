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
}

export interface AiTranscriptionResult {
  transcript: string;
  detectedLanguage: DetectedLanguage;
}

export interface AiImageAnalysis {
  description: string;
  category: ReportCategory;
  hasVisibleIssue: boolean;
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
