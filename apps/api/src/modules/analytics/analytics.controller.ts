import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { Public, Roles } from 'src/common/decorators/roles.decorators';
import { UserRole } from 'src/common/enums/roles.enums';

@Public()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  async overview(@Res() res: Response) {
    res.success(await this.service.getOverview());
  }

  @Get('locations')
  async locations(@Query('location_type') locationType: string | undefined, @Res() res: Response) {
    res.success(await this.service.getLocationSummary(locationType));
  }

  @Get('counties')
  async counties(@Res() res: Response) {
    res.success(await this.service.getCountySummary());
  }

  @Get('categories')
  async categories(@Res() res: Response) {
    res.success(await this.service.getTopCategories());
  }

  @Roles(UserRole.SuperAdmin, UserRole.Admin, UserRole.Moderator)
  @Get('returning-devices')
  async returningDevices(@Res() res: Response) {
    res.success(await this.service.getReturningDevices());
  }
}
