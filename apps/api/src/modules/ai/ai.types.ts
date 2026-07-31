// Seed categories — the starting vocabulary Gemma is told about on every
// call. This is intentionally NOT a closed enum: `category` on every
// analysis result is a plain `string` so Gemma can propose a genuinely new
// category when a report doesn't fit any of these well (e.g. "school
// uniforms shortage" showing up repeatedly shouldn't get buried in
// "education" or "other" forever). See CategoryDiscoveryService, which
// tracks how often a novel category label recurs and promotes it into the
// active vocabulary once it's proven to be a real recurring theme rather
// than a one-off.
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

// Kenya has 40+ living languages — this covers the ones most likely to
// show up in civic voice/text reports nationwide, beyond the English/
// Kiswahili/Sheng set. 'other' remains the catch-all for anything not
// listed (rather than forcing a bad guess) so a genuinely rare language
// doesn't get mis-tagged as one of these.
export type DetectedLanguage =
  | 'en' // English
  | 'sw' // Kiswahili
  | 'sheng' // Sheng (Nairobi urban slang blend of Swahili/English)
  | 'ki' // Gikuyu
  | 'luo' // Dholuo
  | 'luy' // Luhya
  | 'kam' // Kikamba
  | 'kln' // Kalenjin
  | 'guz' // Ekegusii
  | 'mer' // Kimeru
  | 'mas' // Maa (Maasai)
  | 'so' // Somali
  | 'tuv' // Turkana
  | 'other';

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
  /** One of the seed categories, or a novel Gemma-proposed category slug. */
  category: string;
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
  /** One of the seed categories, or a novel Gemma-proposed category slug. */
  category: string;
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