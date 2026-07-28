import { Module } from '@nestjs/common';
import { DigestsController } from './digests.controller';
import { DigestsService } from './digests.service';
import { DigestsRepository } from './digests.repository';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [DigestsController],
  providers: [DigestsService, DigestsRepository],
})
export class DigestsModule {}
