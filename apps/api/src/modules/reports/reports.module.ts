import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { ReportsMapper } from './reports.mapper';
import { AiModule } from '../ai/ai.module';
import { DevicesModule } from '../devices/devices.module';
import { StorageModule } from '../storage/storage.module';
import { AbuseLogsModule } from '../abuse-logs/abuse-logs.module';

@Module({
  imports: [AiModule, DevicesModule, StorageModule, AbuseLogsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository, ReportsMapper],
  // ReportsRepository is exported alongside the service since votes/comments
  // need a lightweight existence check without importing the whole service.
  exports: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
