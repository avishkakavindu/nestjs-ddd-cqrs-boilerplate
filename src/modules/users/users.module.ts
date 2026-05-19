import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { UsersController } from './users.controller';

const CommandHandlers = [RegisterUserHandler];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [...CommandHandlers],
})
export class UsersModule {}
