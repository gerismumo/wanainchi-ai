import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommentsRepository } from './comments.repository';
import { ReportsRepository } from '../reports/reports.repository';

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo: CommentsRepository,
    private readonly reportsRepo: ReportsRepository,
  ) {}

  async addComment(reportId: string, userId: string, content: string) {
    const report = await this.reportsRepo.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    return this.repo.create(reportId, userId, content);
  }

  async getForReport(reportId: string, page: number, limit: number) {
    const report = await this.reportsRepo.findById(reportId);
    if (!report) throw new NotFoundException('Report not found');

    return this.repo.findByReport(reportId, page, limit);
  }

  async deleteComment(id: string, userId: string): Promise<void> {
    const deletedCount = await this.repo.delete(id, userId);
    if (!deletedCount) {
      throw new ForbiddenException('Comment not found or not owned by you');
    }
  }
}
