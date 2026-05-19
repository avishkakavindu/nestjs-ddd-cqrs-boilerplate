import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { UserEmailVerifiedEvent } from '../user-email-verified.event';

@EventsHandler(UserEmailVerifiedEvent)
export class UserEmailVerifiedHandler implements IEventHandler<UserEmailVerifiedEvent> {
  private readonly logger = new Logger(UserEmailVerifiedHandler.name);

  handle(event: UserEmailVerifiedEvent): void {
    // TODO: send welcome email once email module (step 8) is built
    this.logger.log(
      `Email verified for user ${event.email} (id: ${event.userId})`,
    );
  }
}
