import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ENV } from 'src/common/config/env.config';
import {
  AiDigestSummary,
  AiImageAnalysis,
  AiTextAnalysis,
  AiTranscriptionResult,
  REPORT_CATEGORIES,
} from './ai.types';

// gemma-4-31b-it is WananchiAI's classification/transcription workhorse —
// cheap enough to run on every single submission, multimodal enough to
// take text, voice notes, and photos through the same client.
const MODEL = 'gemma-4-31b-it';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });

  /**
   * Shared helper: sends a multi-part prompt to Gemma, asks for raw JSON
   * back, and parses it. On any failure (network, malformed JSON, model
   * refusal) it logs and returns the caller-supplied fallback instead of
   * throwing — a citizen's report should never be lost because the AI
   * enrichment step hiccuped.
   */
  private async generateJson<T>(parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>, fallback: T): Promise<T> {
    try {
      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json' },
      });

      const text = response.text ?? '{}';
      return JSON.parse(text) as T;
    } catch (error) {
      this.logger.error(`Gemma call failed: ${(error as Error).message}`);
      return fallback;
    }
  }

  async analyzeText(content: string): Promise<AiTextAnalysis> {
    const prompt = `You are a civic-report classifier for WananchiAI, a Kenyan citizen reporting platform.
Read the citizen report below (it may be in English, Kiswahili, or Sheng) and respond with ONLY a JSON object,
no markdown fences, no commentary, matching this exact shape:
{
  "translatedText": string | null,
  "detectedLanguage": "en" | "sw" | "sheng" | "other",
  "category": one of ${JSON.stringify(REPORT_CATEGORIES)},
  "summary": string (max 2 sentences, in English),
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "urgencyScore": number between 0 and 1,
  "confidenceScore": number between 0 and 1,
  "isSpam": boolean,
  "spamScore": number between 0 and 1
}
Rules:
- "translatedText" is null if the report is already in English, otherwise it is the English translation.
- Mark "isSpam" true only for gibberish, advertising, or content with no genuine civic complaint or request.
- "urgencyScore" should reflect real risk to life, health, or safety, not just emotional tone.

Report:
"""${content}"""`;

    return this.generateJson<AiTextAnalysis>([{ text: prompt }], {
      translatedText: null,
      detectedLanguage: 'other',
      category: 'other',
      summary: content.slice(0, 200),
      sentiment: 'neutral',
      urgencyScore: 0.3,
      confidenceScore: 0,
      isSpam: false,
      spamScore: 0,
    });
  }

  async transcribeVoice(buffer: Buffer, mimetype: string): Promise<AiTranscriptionResult> {
    const prompt = `Transcribe this citizen voice report verbatim. It may be spoken in English, Kiswahili, or Sheng —
transcribe in whichever language(s) it was actually spoken, do not translate.
Respond with ONLY JSON, no markdown fences: { "transcript": string, "detectedLanguage": "en" | "sw" | "sheng" | "other" }`;

    return this.generateJson<AiTranscriptionResult>(
      [
        { text: prompt },
        { inlineData: { mimeType: mimetype, data: buffer.toString('base64') } },
      ],
      { transcript: '', detectedLanguage: 'other' },
    );
  }

  async analyzeImage(buffer: Buffer, mimetype: string, caption?: string): Promise<AiImageAnalysis> {
    const prompt = `Look at this photo submitted as a civic report${caption ? ` with caption: "${caption}"` : ''}.
Describe the visible community issue (e.g. pothole, burst water pipe, uncollected garbage, damaged school block)
in one factual sentence, classify it, and say whether an actual issue is visibly present in the photo.
Respond with ONLY JSON, no markdown fences:
{ "description": string, "category": one of ${JSON.stringify(REPORT_CATEGORIES)}, "hasVisibleIssue": boolean }`;

    return this.generateJson<AiImageAnalysis>(
      [
        { text: prompt },
        { inlineData: { mimeType: mimetype, data: buffer.toString('base64') } },
      ],
      { description: caption ?? 'Photo report submitted by a citizen.', category: 'other', hasVisibleIssue: true },
    );
  }

  async summarizeForDigest(
    reportSummaries: string[],
    categoryCounts: Record<string, number>,
  ): Promise<AiDigestSummary> {
    const prompt = `You are drafting a development-priority digest for an MP or county government, based on
citizen reports collected through WananchiAI.
Report summaries: ${JSON.stringify(reportSummaries.slice(0, 200))}
Category counts: ${JSON.stringify(categoryCounts)}

Write a concise, evidence-based summary (max 5 sentences, plain English, no speculation beyond the data given)
of the emerging community priorities for this period, and rank the top issues by significance.
Respond with ONLY JSON, no markdown fences:
{ "summaryText": string, "topIssues": [{ "category": string, "count": number, "avgUrgency": number }] }`;

    return this.generateJson<AiDigestSummary>([{ text: prompt }], {
      summaryText: 'Not enough data was submitted in this period to generate a reliable summary.',
      topIssues: [],
    });
  }
}
