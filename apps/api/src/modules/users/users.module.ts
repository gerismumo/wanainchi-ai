import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';

import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { DatabaseModule } from 'src/database/knex.module';
import { UsersMapper } from './users.mapper';
import { MailModule } from '../mail/mail.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, MailModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UsersMapper],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
