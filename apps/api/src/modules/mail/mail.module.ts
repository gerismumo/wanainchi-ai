import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailTemplates } from './mail.templates';

@Module({
  imports: [],
  controllers: [],
  providers: [MailTemplates, MailService],
  exports: [MailService],
})
export class MailModule {}
