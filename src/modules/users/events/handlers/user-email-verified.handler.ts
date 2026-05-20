import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { EmailService } from '../../../email/email.service';
import { UserEmailVerifiedEvent } from '../user-email-verified.event';

@EventsHandler(UserEmailVerifiedEvent)
export class UserEmailVerifiedHandler implements IEventHandler<UserEmailVerifiedEvent> {
  private readonly logger = new Logger(UserEmailVerifiedHandler.name);

  constructor(private readonly emailService: EmailService) {}

  async handle(event: UserEmailVerifiedEvent): Promise<void> {
    await this.emailService.sendWelcomeEmail({
      email: event.email,
      firstName: event.firstName,
    });

    this.logger.log(`Welcome email sent to ${event.email}`);
  }
}
