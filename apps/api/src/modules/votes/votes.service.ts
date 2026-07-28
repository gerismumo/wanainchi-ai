import { Injectable, NotFoundException } from '@nestjs/common';
import { VotesRepository } from './votes.repository';
import { ReportsRepository } from '../reports/reports.repository';

export interface VoteResult {
  voted: boolean;
  voteCount: number;
}

@Injectable()
export class VotesService {
  constructor(
    private readonly repo: VotesRepository,
    private readonly reportsRepo: ReportsRepository,
  ) {}

  async toggleVote(reportId: string, userId: string | null, deviceId: string | null): Promise<VoteResult> {
    const report = await this.reportsRepo.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    const existing = await this.repo.findExisting(reportId, userId, deviceId);

    if (existing) {
      await this.repo.remove(existing.id);
    } else {
      await this.repo.create(reportId, userId, deviceId);
    }

    const voteCount = await this.repo.countForReport(reportId);
    return { voted: !existing, voteCount };
  }
}
