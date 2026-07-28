import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CommentsService } from './comments.service';
import { commentQuerySchema, createCommentSchema } from './dto/comment.dto';
import { Public, Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from 'src/common/enums/roles.enums';

@Controller('reports/:reportId/comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  // Verified users only — keeps the abuse surface smaller than allowing
  // anonymous comments alongside anonymous reports/votes.
  @Roles(UserRole.SuperAdmin, UserRole.Admin, UserRole.Moderator, UserRole.Agent, UserRole.User)
  @Post()
  async create(
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const dto = createCommentSchema.parse(body);
    const result = await this.service.addComment(reportId, req.user.id, dto.content);
    res.success(result, 'Comment added');
  }

  @Public()
  @Get()
  async list(
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    const dto = commentQuerySchema.parse(query);
    const result = await this.service.getForReport(reportId, dto.page, dto.limit);
    res.success(result);
  }

  @Roles(UserRole.SuperAdmin, UserRole.Admin, UserRole.Moderator, UserRole.Agent, UserRole.User)
  @Delete(':commentId')
  async remove(
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.service.deleteComment(commentId, req.user.id);
    res.success(null, 'Comment deleted');
  }
}
