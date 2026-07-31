import { Module } from '@nestjs/common';
import { CategoryDiscoveryService } from './category-discovery.service';
import { CategoryDiscoveryRepository } from './category-discovery.repository';

@Module({
  providers: [CategoryDiscoveryService, CategoryDiscoveryRepository],
  exports: [CategoryDiscoveryService, CategoryDiscoveryRepository],
})
export class CategoryDiscoveryModule {}
