import { Module } from '@nestjs/common';
import { Authservice } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [Authservice],
})
export class AuthModule {}
