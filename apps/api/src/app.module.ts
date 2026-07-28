import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { StorageModule } from './modules/storage/storage.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './common/config/constants.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AbuseLogsModule } from './modules/abuse-logs/abuse-logs.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DevicesModule } from './modules/devices/devices.module';
import { DigestsModule } from './modules/digests/digests.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VotesModule } from './modules/votes/votes.module';

@Module({
  imports: [
    AbuseLogsModule,
    AiModule,
    AnalyticsModule,
    DevicesModule,
    DigestsModule,
    ReportsModule,
    VotesModule,
    UsersModule,
    AuthModule,
    MailModule,
    StorageModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
