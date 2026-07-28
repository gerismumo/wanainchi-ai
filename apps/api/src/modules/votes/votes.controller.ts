import { Controller, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { VotesService } from './votes.service';
import { Public } from 'src/common/decorators/roles.decorators';
import { DeviceContext, DevicesService } from '../devices/devices.service';
import { DeviceId } from 'src/common/decorators/device.decorator';

@Controller('reports/:reportId/vote')
export class VotesController {
  constructor(
    private readonly service: VotesService,
    private readonly devicesService: DevicesService,
  ) {}

  @Public()
  @Post()
  async toggle(
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
    @DeviceId() deviceCtx: DeviceContext,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = req.user?.id ?? null;
    let deviceId: string | null = null;

    if (!userId) {
      const device = await this.devicesService.resolveDevice(deviceCtx, req.clientIp ?? null, null);
      deviceId = device.id;
    }

    const result = await this.service.toggleVote(reportId, userId, deviceId);
    res.success(result, result.voted ? 'Vote recorded' : 'Vote removed');
  }
}
