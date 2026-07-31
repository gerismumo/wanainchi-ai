import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Report } from 'knex/types/tables';
import { ReportsRepository } from './reports.repository';
import { ReportsMapper } from './reports.mapper';
import { AiService } from '../ai/ai.service';
import { DevicesService, DeviceContext } from '../devices/devices.service';
import { StorageUpload } from '../storage/storage.upload';
import { AbuseLogsRepository } from '../abuse-logs/abuse-logs.repository';
import { CategoryDiscoveryService } from '../category-discovery/category-discovery.service';
import {
  resolveLocation,
  resolveLocationByName,
  ResolvedLocation,
  expandLocationCodes,
} from 'src/common/util/location.util';
import {
  CreateMediaReportDto,
  CreateTextReportDto,
  LocationInputDto,
  ReportQueryDto,
} from './dto/report.dto';
import { PaginatedResult } from 'src/common/util/pagination.util';
import { ReportPublic } from './types/report.types';
import {
  AiImageAnalysis,
  AiTextAnalysis,
  MentionedLocation,
} from '../ai/ai.types';

// Hourly submission caps per device — low-trust devices (repeat spam/rate-limit
// hits) get squeezed harder than a clean, established device.
const DEFAULT_HOURLY_LIMIT = 6;
const LOW_TRUST_HOURLY_LIMIT = 2;
const LOW_TRUST_THRESHOLD = 0.3;

// A near-duplicate report (same category, same location, similar wording,
// submitted within this window) gets linked instead of surfaced twice.
const DUPLICATE_SIMILARITY_THRESHOLD = 0.6;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly repo: ReportsRepository,
    private readonly mapper: ReportsMapper,
    private readonly ai: AiService,
    private readonly devices: DevicesService,
    private readonly storage: StorageUpload,
    private readonly abuseLogs: AbuseLogsRepository,
    private readonly categoryDiscovery: CategoryDiscoveryService,
  ) {}

  async createTextReport(
    dto: CreateTextReportDto,
    deviceCtx: DeviceContext,
    ip: string | null,
    userId: string | null,
  ): Promise<ReportPublic | null> {
    const device = await this.devices.resolveDevice(deviceCtx, ip, null);
    await this.guardRateLimit(device.id, device.trust_score, ip);

    const allowedCategories =
      await this.categoryDiscovery.getAllowedCategories();

    // AI enrichment failure degrades gracefully — the report is still saved
    // with sensible defaults, but the error details are logged and returned.
    let analysis: AiTextAnalysis;
    try {
      analysis = await this.ai.analyzeText(dto.content_text, allowedCategories);
    } catch (err) {
      this.logger.warn(`Text AI enrichment skipped: ${(err as Error).message}`);
      analysis = {
        translatedText: null,
        detectedLanguage: 'other',
        category: 'other',
        summary: dto.content_text.slice(0, 200),
        sentiment: 'neutral',
        urgencyScore: 0.3,
        confidenceScore: 0,
        isSpam: false,
        spamScore: 0,
        mentionedLocation: null,
      };
    }

    // Groups a novel category label with any similar one already seen, and
    // returns the stable slug to store — this is what makes new categories
    // "appear" automatically once they recur, instead of staying forever
    // scattered under "other" with slightly different wording each time.
    const category = await this.categoryDiscovery.resolveCategory(
      analysis.category,
    );

    const location = await this.resolveLocationWithAiFallback(
      dto,
      analysis.mentionedLocation,
    );

    const report = await this.repo.create({
      type: 'text',
      content_text: dto.content_text,
      language:
        analysis.detectedLanguage !== 'other'
          ? analysis.detectedLanguage
          : dto.language,
      user_id: userId,
      device_id: device.id,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      ...location,
      category,
      summary: analysis.summary || dto.content_text.slice(0, 200),
      sentiment: analysis.sentiment,
      urgency_score: analysis.urgencyScore.toFixed(
        3,
      ) as unknown as Report['urgency_score'],
      confidence_score: analysis.confidenceScore.toFixed(
        3,
      ) as unknown as Report['confidence_score'],
      is_spam: analysis.isSpam,
      spam_score: analysis.spamScore.toFixed(
        3,
      ) as unknown as Report['spam_score'],
      status: analysis.isSpam ? 'reviewed' : 'processing',
    });

    await this.finalizeReport(report, device.id, ip, analysis.isSpam);

    return this.mapper.toPublic((await this.repo.findById(report.id))!);
  }

  async createMediaReport(
    type: 'voice' | 'photo',
    file: Express.Multer.File,
    dto: CreateMediaReportDto,
    deviceCtx: DeviceContext,
    ip: string | null,
    userId: string | null,
  ): Promise<ReportPublic> {
    if (!file) {
      throw new BadRequestException(`A ${type} file is required`);
    }

    const device = await this.devices.resolveDevice(deviceCtx, ip, null);
    await this.guardRateLimit(device.id, device.trust_score, ip);

    const allowedCategories =
      await this.categoryDiscovery.getAllowedCategories();
    const mediaUrl = await this.storage.handleReportUpload(file);

    let contentText = dto.caption ?? '';
    let rawCategory: string;
    let summary: string;
    let sentiment: Report['sentiment'] = 'neutral';
    let urgency = 0.3;
    let confidence = 0.5;
    let isSpam = false;
    let spamScore = 0;
    let language = 'en';
    let mentionedLocation: MentionedLocation | null = null;

    if (type === 'voice') {
      // transcribeVoice uses gemini-3.6-flash — audio errors must surface
      // to the user since without a transcript there's nothing to classify.
      const transcription = await this.ai.transcribeVoice(
        file.buffer,
        file.mimetype,
      );
      contentText = transcription.transcript || contentText;
      language =
        transcription.detectedLanguage !== 'other'
          ? transcription.detectedLanguage
          : 'en';

      // Text analysis on the transcript is best-effort — fall back gracefully.
      let analysis: AiTextAnalysis;
      try {
        analysis = await this.ai.analyzeText(
          contentText ||
            dto.caption ||
            'Voice report with no clear transcript available.',
          allowedCategories,
        );
      } catch (err) {
        this.logger.warn(
          `Voice text AI enrichment skipped: ${(err as Error).message}`,
        );
        analysis = {
          translatedText: null,
          detectedLanguage: 'other',
          category: 'other',
          summary: contentText.slice(0, 200),
          sentiment: 'neutral',
          urgencyScore: 0.3,
          confidenceScore: 0,
          isSpam: false,
          spamScore: 0,
          mentionedLocation: null,
        };
      }
      rawCategory = analysis.category;
      summary = analysis.summary;
      sentiment = analysis.sentiment;
      urgency = analysis.urgencyScore;
      confidence = analysis.confidenceScore;
      isSpam = analysis.isSpam;
      spamScore = analysis.spamScore;
      mentionedLocation =
        analysis.mentionedLocation ?? transcription.mentionedLocation;
    } else {
      // Image analysis is best-effort — fall back gracefully on error.
      let imageAnalysis: AiImageAnalysis;
      try {
        imageAnalysis = await this.ai.analyzeImage(
          file.buffer,
          file.mimetype,
          dto.caption,
          allowedCategories,
        );
      } catch (err) {
        this.logger.warn(
          `Image AI enrichment skipped: ${(err as Error).message}`,
        );
        imageAnalysis = {
          description: dto.caption ?? 'Photo report submitted by a citizen.',
          category: 'other',
          hasVisibleIssue: true,
          isSpam: false,
          spamScore: 0,
          mentionedLocation: null,
        };
      }
      contentText = dto.caption ?? imageAnalysis.description;
      rawCategory = imageAnalysis.category;
      summary = imageAnalysis.description;
      confidence = imageAnalysis.hasVisibleIssue ? 0.7 : 0.3;
      urgency = imageAnalysis.hasVisibleIssue ? 0.4 : 0.15;
      isSpam = imageAnalysis.isSpam;
      spamScore = imageAnalysis.spamScore;
      mentionedLocation = imageAnalysis.mentionedLocation;
    }

    const category = await this.categoryDiscovery.resolveCategory(rawCategory);
    const location = await this.resolveLocationWithAiFallback(
      dto,
      mentionedLocation,
    );

    const report = await this.repo.create({
      type,
      content_text: contentText,
      media_url: mediaUrl,
      language,
      user_id: userId,
      device_id: device.id,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      ...location,
      category,
      summary,
      sentiment,
      urgency_score: urgency.toFixed(3) as unknown as Report['urgency_score'],
      confidence_score: confidence.toFixed(
        3,
      ) as unknown as Report['confidence_score'],
      is_spam: isSpam,
      spam_score: spamScore.toFixed(3) as unknown as Report['spam_score'],
      status: isSpam ? 'reviewed' : 'processing',
    });

    await this.finalizeReport(report, device.id, ip, isSpam);

    return this.mapper.toPublic((await this.repo.findById(report.id))!);
  }

  async getById(id: string): Promise<ReportPublic> {
    const report = await this.repo.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    return this.mapper.toPublic(report);
  }

  async getPaginated(
    query: ReportQueryDto,
  ): Promise<PaginatedResult<ReportPublic>> {
    // If location filter is provided, expand it to include all child locations
    let locations: ReturnType<typeof expandLocationCodes> | undefined;

    if (query.location_type && query.location_code) {
      locations = expandLocationCodes(query.location_type, query.location_code);
    }

    const result = await this.repo.findPaginated({
      page: query.page,
      limit: query.limit,
      status: query.status,
      category: query.category,
      sentiment: query.sentiment,
      locationType: query.location_type,
      locationCode: query.location_code,
      countyCode: query.county_code,
      constituencyCode: query.constituency_code,
      locations: locations && locations.length > 0 ? locations : undefined,
      q: query.q,
      includeSpam: query.include_spam ?? false,
    });

    return { items: this.mapper.toPublicList(result.items), meta: result.meta };
  }

  async getMine(
    deviceCtx: DeviceContext,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ReportPublic>> {
    if (!deviceCtx.clientUuid && !deviceCtx.fingerprintHash) {
      throw new BadRequestException(
        'A device identifier (x-client-uuid header) is required',
      );
    }

    const device = await this.devices.resolveDevice(deviceCtx, null, null);
    const result = await this.repo.findByDevice(device.id, page, limit);

    return { items: this.mapper.toPublicList(result.items), meta: result.meta };
  }

  async updateStatus(
    id: string,
    status: Report['status'],
  ): Promise<ReportPublic> {
    const updated = await this.repo.updateStatus(id, status);
    if (!updated) throw new NotFoundException('Report not found');
    return this.mapper.toPublic({
      ...updated,
      vote_count: '0',
      comment_count: '0',
    });
  }

  private async finalizeReport(
    report: Report,
    deviceId: string,
    ip: string | null,
    isSpam: boolean,
  ): Promise<void> {
    await this.tryFlagDuplicate(report);

    if (isSpam) {
      await this.abuseLogs.log({
        report_id: report.id,
        device_id: deviceId,
        ip_address: ip,
        reason: 'ai_flagged',
      });
      await this.devices.penalize(deviceId);
    } else {
      await this.devices.reward(deviceId);
    }
  }

  /**
   * Location fields on every report DTO are optional by design — most
   * citizens will never touch a map picker, especially on voice/SMS. If the
   * client did supply an explicit location_type/location_code (e.g. from a
   * GPS-confirmed picker), that always wins since it's more reliable than
   * an NLP guess. Otherwise, fall back to whatever place Gemma pulled out
   * of the report text/photo and resolve it by name instead of by code.
   */
  private resolveReportLocation(
    dto: LocationInputDto,
    mentioned: MentionedLocation | null,
  ): ResolvedLocation {
    if (dto.location_type && dto.location_code) {
      return resolveLocation(dto.location_type, dto.location_code);
    }

    if (mentioned?.name) {
      return resolveLocationByName(mentioned.name, mentioned.levelGuess);
    }

    return resolveLocation(undefined, undefined);
  }

  /**
   * Escalating fallback when the normal name/code resolution comes back
   * completely empty (no client-picked location AND Gemma's mentionedLocation
   * either wasn't present or didn't match anything in ke-locations-data).
   *
   * Order:
   *   1. resolveReportLocation() — client dto, then mentionedLocation by name.
   *   2. Ask the AI for the exact CONSTITUENCY the mentioned place belongs to,
   *      then resolve THAT name against the package. AI output is never
   *      trusted directly — it only counts if resolveLocationByName() can
   *      confirm it as a real constituency in ke-locations-data.
   *   3. Same escalation one level up, asking the AI for the exact COUNTY.
   *   4. If all three fail, return the all-null EMPTY shape (from step 1) —
   *      never blocks report creation just because location couldn't resolve.
   */
  private async resolveLocationWithAiFallback(
    dto: LocationInputDto,
    mentioned: MentionedLocation | null,
  ): Promise<ResolvedLocation> {
    const initial = this.resolveReportLocation(dto, mentioned);
    if (initial.location_type && initial.location_code) {
      return initial;
    }

    const placeName = mentioned?.name;
    if (!placeName) {
      return initial;
    }

    // Step 2 — constituency-level AI lookup, validated against the package.
    try {
      const { name: constituencyName } =
        await this.ai.getExactConstituecy(placeName);
      if (constituencyName) {
        const resolved = resolveLocationByName(
          constituencyName,
          'constituency',
        );
        if (resolved.location_type && resolved.location_code) {
          return resolved;
        }
      }
    } catch (err) {
      this.logger.warn(
        `AI constituency fallback failed for "${placeName}": ${(err as Error).message}`,
      );
    }

    // Step 3 — county-level AI lookup, same validation rule.
    try {
      const { name: countyName } = await this.ai.getExactCounty(placeName);
      if (countyName) {
        const resolved = resolveLocationByName(countyName, 'county');
        if (resolved.location_type && resolved.location_code) {
          return resolved;
        }
      }
    } catch (err) {
      this.logger.warn(
        `AI county fallback failed for "${placeName}": ${(err as Error).message}`,
      );
    }

    return initial;
  }

  private async guardRateLimit(
    deviceId: string,
    trustScore: string,
    ip: string | null,
  ): Promise<void> {
    const recentCount = await this.devices.countRecentSubmissions(deviceId, 60);
    const trust = parseFloat(trustScore ?? '0.5');
    const limit =
      trust < LOW_TRUST_THRESHOLD
        ? LOW_TRUST_HOURLY_LIMIT
        : DEFAULT_HOURLY_LIMIT;

    if (recentCount >= limit) {
      await this.abuseLogs.log({
        report_id: null,
        device_id: deviceId,
        ip_address: ip,
        reason: 'rate_limit',
      });
      throw new ForbiddenException(
        'You have submitted too many reports recently. Please try again later.',
      );
    }
  }

  private async tryFlagDuplicate(report: Report): Promise<void> {
    if (!report.category || report.is_spam) return;

    const candidates = await this.repo.findRecentCandidatesForDuplicate(
      report.category,
      report.location_code,
      report.id,
    );
    if (!candidates.length) return;

    const reportText = (report.summary || report.content_text || '')
      .toLowerCase()
      .trim();
    if (!reportText) return;

    const match = candidates.find((candidate) => {
      const candidateText = (candidate.summary || candidate.content_text || '')
        .toLowerCase()
        .trim();
      if (!candidateText) return false;
      return (
        this.textSimilarity(reportText, candidateText) >
        DUPLICATE_SIMILARITY_THRESHOLD
      );
    });

    if (match) {
      await this.repo.markDuplicate(report.id, match.id);
    }
  }

  /**
   * Jaccard similarity on word sets. Deliberately lightweight — good enough
   * to catch near-identical reports of "the same pothole on X road" without
   * needing a live vector-DB round trip on every single submission. Real
   * semantic dedupe still happens downstream via embedding_id + Qdrant.
   */
  private textSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/).filter(Boolean));
    const setB = new Set(b.split(/\s+/).filter(Boolean));
    if (!setA.size || !setB.size) return 0;

    let intersection = 0;
    for (const word of setA) if (setB.has(word)) intersection += 1;

    const union = setA.size + setB.size - intersection;

    const result = union === 0 ? 0 : intersection / union;

    return result;
  }
}
