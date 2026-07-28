import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DigestsRepository } from './digests.repository';
import { AiService } from '../ai/ai.service';
import {
  expandLocationCodes,
  resolveLocation,
} from 'src/common/util/location.util';
import { GenerateDigestInput } from './digests.types';
import { LocationType } from 'src/database/types/knex-tables';

@Injectable()
export class DigestsService {
  constructor(
    private readonly repo: DigestsRepository,
    private readonly ai: AiService,
  ) {}

  async generate(input: GenerateDigestInput) {
    const location = resolveLocation(input.location_type, input.location_code);
    if (!location.location_code) {
      throw new BadRequestException(
        'Unknown location_type/location_code combination',
      );
    }

    if (new Date(input.period_start) > new Date(input.period_end)) {
      throw new BadRequestException('period_start must be before period_end');
    }

    const locations = expandLocationCodes(
      input.location_type,
      input.location_code,
    );

    const reports = await this.repo.getReportsForPeriod(
      locations,
      input.period_start,
      input.period_end,
    );

    if (reports.length === 0) {
      throw new BadRequestException(
        'No reports found accoring to search creteria',
      );
    }

    const categoryCounts: Record<string, number> = {};
    for (const report of reports) {
      if (!report.category) continue;
      categoryCounts[report.category] =
        (categoryCounts[report.category] ?? 0) + 1;
    }

    const summaries = reports
      .map((r) => r.summary || r.content_text || '')
      .filter(Boolean);
    const aiSummary = await this.ai.summarizeForDigest(
      summaries,
      categoryCounts,
    );

    const topIssues = aiSummary.topIssues.map(
      ({ category, count, avgUrgency }) => ({
        category,
        count,
        avg_urgency: avgUrgency,
      }),
    );

    return this.repo.create({
      ...location,
      period_start: input.period_start,
      period_end: input.period_end,
      summary_text: aiSummary.summaryText,
      top_issues: JSON.stringify(topIssues),
      report_count: reports.length,
    });
  }

  async getById(id: string) {
    const digest = await this.repo.findById(id);
    if (!digest) throw new NotFoundException('Digest not found');
    return digest;
  }

  async getLatest(locationType: LocationType, locationCode: string) {
    const digest = await this.repo.findLatest(locationType, locationCode);
    if (!digest)
      throw new NotFoundException(
        'No digest has been generated for this location yet',
      );
    return digest;
  }

  async getPaginated(
    locationType: string | undefined,
    locationCode: string | undefined,
    page: number,
    limit: number,
  ) {
    return this.repo.findPaginated(locationType, locationCode, page, limit);
  }
}
