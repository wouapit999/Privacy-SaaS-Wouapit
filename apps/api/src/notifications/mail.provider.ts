import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Transactional email abstraction.
 * - MAIL_PROVIDER=stub  → logs the message (no network); default for local/dev.
 * - smtp / resend       → clearly-marked TODO integration points.
 *
 * We only ever email the authenticated user's own verified address.
 */
@Injectable()
export class MailProvider {
  private readonly logger = new Logger(MailProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(msg: MailMessage): Promise<void> {
    const provider = this.config.get<string>('mail.provider');
    const from = this.config.get<string>('mail.from');

    if (provider === 'stub' || !this.config.get<string>('mail.apiKey')) {
      this.logger.log(
        `[mail:stub] From ${from} → ${msg.to} | ${msg.subject}\n${msg.text}`,
      );
      return;
    }

    // TODO: integrate the real provider (Resend/SES/SMTP) using mail.apiKey.
    this.logger.warn(
      `[mail:${provider}] not implemented; would send "${msg.subject}" to ${msg.to}.`,
    );
  }
}
