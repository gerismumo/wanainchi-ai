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

// gemma-4-31b-it handles text and image classification — cheap enough to
// run on every submission. gemma-4-4b-it is used only for voice
// transcription because gemma-4-31b-it does not support audio input modality.
const MODEL = 'gemma-4-31b-it';
const AUDIO_MODEL = 'gemini-3.6-flash';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });


  /**
   * Shared helper: sends a multi-part prompt, asks for raw JSON back, and
   * parses it. On any failure (network, malformed JSON, model refusal) it
   * logs the full error and re-throws so that the caller — and ultimately
   * the HTTP response — can surface a meaningful message instead of
   * silently returning a fallback that hides the real problem.
   */
  private async generateJson<T>(
    parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >,
    model = MODEL,
  ): Promise<T> {
    let text = '{}';
    try {
      const response = await this.client.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json' },
      });
      text = response.text ?? '{}';
      return JSON.parse(text) as T;
    } catch (error: any) {
      let message: any = 'Unknown AI error';

      try {
        const parsed = JSON.parse(error.message);
        message = parsed?.error?.message ?? error.message;

        // Keep only the first sentence
        message = message.split('\n')[0];
      } catch {
        message = error.message || String(error);
      }

      this.logger.error(`AI call failed (model=${model}): ${message}`);

      throw new Error(message);
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
  "spamScore": number between 0 and 1,
  "mentionedLocation": { "name": string, "levelGuess": "county" | "constituency" | "ward" | "locality" | "area" | null } | null
}
Rules:
- "translatedText" is null if the report is already in English, otherwise it is the English translation.
- Mark "isSpam" true only for gibberish, advertising, or content with no genuine civic complaint or request.
- "urgencyScore" should reflect real risk to life, health, or safety, not just emotional tone.
- "mentionedLocation": if the report names a specific place — a county, constituency, ward, estate,
  market, road, or well-known landmark — extract it as written (e.g. "Kangemi", "Waiyaki Way") and give
  your best guess at its administrative level. Set "levelGuess" to null if you can't tell the level.
  Set "mentionedLocation" to null entirely if no place is named. Never invent a place that isn't there.

Report:
"""${content}"""`;

    // Re-throw — callers that can tolerate a degraded result must catch themselves.
    return this.generateJson<AiTextAnalysis>([{ text: prompt }]);
  }

  async transcribeVoice(
    buffer: Buffer,
    mimetype: string,
  ): Promise<AiTranscriptionResult> {
    const prompt = `Transcribe this citizen voice report verbatim. It may be spoken in English, Kiswahili, or Sheng —
transcribe in whichever language(s) it was actually spoken, do not translate.
Also listen for any specific place named in the recording — a county, constituency, ward, estate, market,
road, or well-known landmark — and extract it, since many callers will name their location out loud
instead of using a map picker.
Respond with ONLY JSON, no markdown fences:
{
  "transcript": string,
  "detectedLanguage": "en" | "sw" | "sheng" | "other",
  "mentionedLocation": { "name": string, "levelGuess": "county" | "constituency" | "ward" | "locality" | "area" | null } | null
}
Set "mentionedLocation" to null if no place is named in the recording — never guess.`;

    // Using Gemma 4's native multimodal capabilities
    // to process audio directly, ensuring a unified Gemma-powered pipeline.
    return this.generateJson<AiTranscriptionResult>(
      [
        { text: prompt },
        { inlineData: { mimeType: mimetype, data: buffer.toString('base64') } },
      ],
      AUDIO_MODEL,
    );
  }

  async analyzeImage(
    buffer: Buffer,
    mimetype: string,
    caption?: string,
  ): Promise<AiImageAnalysis> {
    const prompt = `Look at this photo submitted as a civic report${caption ? ` with caption: "${caption}"` : ''}.
Describe the visible community issue (e.g. pothole, burst water pipe, uncollected garbage, damaged school block)
in one factual sentence, classify it, and say whether an actual issue is visibly present in the photo.
Also check the caption and any visible signage, shopfronts, or landmarks in the photo itself for a place name.
Finally, judge whether this is a genuine civic report at all, versus spam — a meme, an advertisement, a
screenshot, a selfie or unrelated personal photo, or anything with no visible connection to a real
community issue.
Respond with ONLY JSON, no markdown fences:
{
  "description": string,
  "category": one of ${JSON.stringify(REPORT_CATEGORIES)},
  "hasVisibleIssue": boolean,
  "isSpam": boolean,
  "spamScore": number between 0 and 1,
  "mentionedLocation": { "name": string, "levelGuess": "county" | "constituency" | "ward" | "locality" | "area" | null } | null
}
Set "mentionedLocation" to null if no place name is legible in the caption or the photo — never guess.
Mark "isSpam" true only when the photo clearly isn't a civic report — an unrelated issue that's plausibly
a real community problem should NOT be marked spam even if you're unsure of the exact category.`;

    return this.generateJson<AiImageAnalysis>([
      { text: prompt },
      { inlineData: { mimeType: mimetype, data: buffer.toString('base64') } },
    ]);
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

    return this.generateJson<AiDigestSummary>([{ text: prompt }]);
  }
}
