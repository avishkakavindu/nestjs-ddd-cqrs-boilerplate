import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';

interface VerificationEmailPayload {
  email: string;
  firstName: string;
  verificationUrl: string;
  expiryHours: number;
}

interface WelcomeEmailPayload {
  email: string;
  firstName: string;
}

// Single interface for all outgoing emails.
// Owns template selection, subject translation, and context construction.
// Callers pass domain data — they never touch SMTP or template names directly.
// Subjects are translated with the fallback language ('en') because emails are
// sent outside of HTTP request context — there is no Accept-Language header.
@Injectable()
export class EmailService {
  constructor(
    private readonly mailer: MailerService,
    private readonly i18n: I18nService,
  ) {}

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    await this.mailer.sendMail({
      to: payload.email,
      subject: this.i18n.t('email.AUTH.VERIFICATION.SUBJECT', { lang: 'en' }),
      template: 'verify-email',
      context: {
        firstName: payload.firstName,
        verificationUrl: payload.verificationUrl,
        expiryHours: payload.expiryHours,
      },
    });
  }

  async sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<void> {
    await this.mailer.sendMail({
      to: payload.email,
      subject: this.i18n.t('email.AUTH.WELCOME.SUBJECT', { lang: 'en' }),
      template: 'welcome-email',
      context: {
        firstName: payload.firstName,
      },
    });
  }
}
