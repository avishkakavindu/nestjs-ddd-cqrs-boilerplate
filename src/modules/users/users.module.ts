import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { UsersController } from './users.controller';

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    // Handlers are registered here as they are added in subsequent steps.
    // CommandHandlers, QueryHandlers, and EventHandlers must all be listed
    // here explicitly — the bus only knows about handlers that are providers.
  ],
})
export class UsersModule {}
