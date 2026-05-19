import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { UserRegisteredEvent } from '../user-registered.event';

// Event handler: reacts to a domain event. Runs after the command handler has saved state.
// Responsible for side effects - email, audit log, read model update, etc.
// If this fails, the user is already saved. Side effects are decoupled from the main transaction.
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  private readonly logger = new Logger(UserRegisteredHandler.name);

  handle(event: UserRegisteredEvent): void {
    // TODO: inject EmailService and send verification email once email module (step 8) is built
    this.logger.log(
      `User registered: ${event.email} (id: ${event.userId}) - verification email pending`,
    );
  }
}
