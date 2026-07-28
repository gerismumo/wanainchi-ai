import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import {
  createMediaReportSchema,
  createTextReportSchema,
  myReportsQuerySchema,
  reportQuerySchema,
  updateReportStatusSchema,
} from './dto/report.dto';
import { Public, Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from 'src/common/enums/roles.enums';

import { DeviceContext } from '../devices/devices.service';
import { DeviceId } from 'src/common/decorators/device.decorator';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';

// 5 submissions per device per minute; IP cap stays at the default 60
const SUBMIT_RATE_LIMIT = RateLimit({ deviceMax: 5, windowMs: 60_000 });

const mediaInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Public()
  @SUBMIT_RATE_LIMIT
  @Post('text')
  async createText(
    @Body() body: unknown,
    @DeviceId() deviceCtx: DeviceContext,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const dto = createTextReportSchema.parse(body);

    const result = await this.service.createTextReport(
      dto,
      deviceCtx,
      req.clientIp ?? null,
      req.user?.id ?? null,
    );

    res.success(result, 'Report submitted successfully');
  }

  @Public()
  @SUBMIT_RATE_LIMIT
  @Post('voice')
  @UseInterceptors(mediaInterceptor)
  async createVoice(
    @Body() body: unknown,
    @UploadedFile() file: Express.Multer.File,
    @DeviceId() deviceCtx: DeviceContext,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const dto = createMediaReportSchema.parse(body);

    const result = await this.service.createMediaReport(
      'voice',
      file,
      dto,
      deviceCtx,
      req.clientIp ?? null,
      req.user?.id ?? null,
    );

    res.success(result, 'Voice report submitted successfully');
  }

  @Public()
  @SUBMIT_RATE_LIMIT
  @Post('photo')
  @UseInterceptors(mediaInterceptor)
  async createPhoto(
    @Body() body: unknown,
    @UploadedFile() file: Express.Multer.File,
    @DeviceId() deviceCtx: DeviceContext,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const dto = createMediaReportSchema.parse(body);

    const result = await this.service.createMediaReport(
      'photo',
      file,
      dto,
      deviceCtx,
      req.clientIp ?? null,
      req.user?.id ?? null,
    );

    res.success(result, 'Photo report submitted successfully');
  }

  @Public()
  @Get('mine')
  async getMine(
    @Query() query: unknown,
    @DeviceId() deviceCtx: DeviceContext,
    @Res() res: Response,
  ) {
    const dto = myReportsQuerySchema.parse(query);
    const result = await this.service.getMine(deviceCtx, dto.page, dto.limit);
    res.success(result);
  }

  @Public()
  @Get()
  async getAll(@Query() query: unknown, @Res() res: Response) {
    const dto = reportQuerySchema.parse(query);
    const result = await this.service.getPaginated(dto);
    res.success(result);
  }

  @Public()
  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const result = await this.service.getById(id);
    res.success(result);
  }

  @Roles(UserRole.Admin, UserRole.SuperAdmin, UserRole.Moderator)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const dto = updateReportStatusSchema.parse(body);
    const result = await this.service.updateStatus(id, dto.status);
    res.success(result, 'Report status updated');
  }
}
