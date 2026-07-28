import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { DigestsService } from './digests.service';
import { digestQuerySchema, generateDigestSchema, latestDigestQuerySchema } from './dto/digest.dto';
import { Public, Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from 'src/common/enums/roles.enums';

@Controller('digests')
export class DigestsController {
  constructor(private readonly service: DigestsService) {}

  @Roles(UserRole.SuperAdmin, UserRole.Admin, UserRole.Moderator)
  @Post('generate')
  async generate(@Body() body: unknown, @Res() res: Response) {
    const dto = generateDigestSchema.parse(body);
    const result = await this.service.generate(dto);
    res.success(result, 'Digest generated successfully');
  }

  @Public()
  @Get('latest')
  async latest(@Query() query: unknown, @Res() res: Response) {
    const dto = latestDigestQuerySchema.parse(query);
    const result = await this.service.getLatest(dto.location_type, dto.location_code);
    res.success(result);
  }

  @Public()
  @Get()
  async list(@Query() query: unknown, @Res() res: Response) {
    const dto = digestQuerySchema.parse(query);
    const result = await this.service.getPaginated(dto.location_type, dto.location_code, dto.page, dto.limit);
    res.success(result);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const result = await this.service.getById(id);
    res.success(result);
  }
}
