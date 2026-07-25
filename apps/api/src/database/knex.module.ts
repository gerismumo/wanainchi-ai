import { Module } from '@nestjs/common';
import { KnexModule } from 'nestjs-knex';
import { ENV } from 'src/common/config/env.config';
import config from './knexfile';

@Module({
  imports: [
    KnexModule.forRoot({
      config: config[ENV.NODE_ENV]!,
    }),
  ],
  exports: [KnexModule],
})
export class DatabaseModule {}
