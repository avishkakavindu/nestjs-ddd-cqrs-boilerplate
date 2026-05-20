import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { AppConfigService } from '../../../../config/app-config.service';
import { EmailService } from '../../../email/email.service';
import { UserRegisteredEvent } from '../user-registered.event';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(UserRegisteredHandler.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly config: AppConfigService,
  ) {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    const verificationUrl = `${this.config.baseUrl}/api/v1/users/verify-email?token=${event.emailVerificationToken}`;

    await this.emailService.sendVerificationEmail({
      email: event.email,
      firstName: event.firstName,
      verificationUrl,
      expiryHours: this.config.emailVerificationExpiryHours,
    });

    this.logger.log(`Verification email sent to ${event.email}`);
  }
}
