import { Module } from '@nestjs/common';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';
import { VotesRepository } from './votes.repository';
import { ReportsModule } from '../reports/reports.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [ReportsModule, DevicesModule],
  controllers: [VotesController],
  providers: [VotesService, VotesRepository],
})
export class VotesModule {}
