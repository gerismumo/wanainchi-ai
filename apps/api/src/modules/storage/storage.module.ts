import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageUpload } from './storage.upload';

@Module({
  providers: [StorageService, StorageUpload],
  exports:[StorageService, StorageUpload]
})
export class StorageModule {}
