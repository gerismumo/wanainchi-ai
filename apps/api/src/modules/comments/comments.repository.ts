import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectKnex } from 'nestjs-knex';
import { Knex } from 'knex';
import { Comment } from 'knex/types/tables';
import {
  buildPaginationMeta,
  PaginatedResult,
} from 'src/common/util/pagination.util';

export interface CommentWithAuthor extends Comment {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

@Injectable()
export class CommentsRepository {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async create(
    reportId: string,
    userId: string,
    content: string,
  ): Promise<Comment> {
    const [comment] = await this.knex('comments')
      .insert({ report_id: reportId, user_id: userId, content })
      .returning('*');

    if (!comment) {
      throw new InternalServerErrorException();
    }
    return comment;
  }

  async findByReport(
    reportId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<CommentWithAuthor>> {
    const totalResult = await this.knex('comments')
      .where({ report_id: reportId })
      .count('id as count')
      .first();
    const total = Number((totalResult as { count?: string })?.count ?? 0);

    const items = await this.knex('comments as c')
      .join('users as u', 'u.id', 'c.user_id')
      .select('c.*', 'u.first_name', 'u.last_name', 'u.avatar_url')
      .where('c.report_id', reportId)
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async delete(id: string, userId: string): Promise<number> {
    return this.knex('comments').where({ id, user_id: userId }).del();
  }
}
