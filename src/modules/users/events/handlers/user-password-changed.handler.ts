import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { UserPasswordChangedEvent } from '../user-password-changed.event';

@EventsHandler(UserPasswordChangedEvent)
export class UserPasswordChangedHandler implements IEventHandler<UserPasswordChangedEvent> {
  private readonly logger = new Logger(UserPasswordChangedHandler.name);

  handle(event: UserPasswordChangedEvent): void {
    // TODO: send security alert email once email module (step 8) is built
    this.logger.log(`Password changed for user id: ${event.userId}`);
  }
}
