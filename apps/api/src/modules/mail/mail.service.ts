import { Injectable, Logger } from '@nestjs/common';
import { MailTemplates } from './mail.templates';
import { ENV } from 'src/common/config/env.config';
import { Resend } from 'resend';


@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = new Resend(ENV.RESEND_API_KEY);

  constructor(private readonly template: MailTemplates) {}



  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: `Wananchi Ai <${ENV.RESEND_FROM_EMAIL}>`,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email → ${to} | ${error.message}`);
        throw new Error(error.message);
      }

      this.logger.log(`Email sent → ${to} | ${subject} | id: ${data?.id}`);
    } catch (err) {
      this.logger.error(
        `Failed to send email → ${to} | ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private async sendToMany(
    recipients: string[],
    subject: string,
    html: string,
  ): Promise<void> {
    const results = await Promise.allSettled(
      recipients.map((to) => this.send(to, subject, html)),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(
        `sendToMany: ${failed}/${recipients.length} admin emails failed for "${subject}"`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════

  async sendResetLink(data: {
    email: string;
    token: string;
    type: 'password' | 'pin';
  }): Promise<void> {
    const { subject, html } = this.template.resetRequest(data);
    await this.send(data.email, subject, html);
  }

  async sendPasswordChangedEmail(data: {
    name: string;
    email: string;
  }): Promise<void> {
    const { subject, html } = this.template.passwordChanged(data);
    await this.send(data.email, subject, html).catch((err) => {
      // Non-critical — log but don't rethrow
      this.logger.error(
        `Password-changed email failed for ${data.email}: ${(err as Error).message}`,
      );
    });
  }

  
}
