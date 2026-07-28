import { Module } from '@nestjs/common';
import { AbuseLogsRepository } from './abuse-logs.repository';

@Module({
  providers: [AbuseLogsRepository],
  exports: [AbuseLogsRepository],
})
export class AbuseLogsModule {}
