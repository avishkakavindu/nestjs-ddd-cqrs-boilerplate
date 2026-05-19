import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ChangePasswordHandler } from './commands/handlers/change-password.handler';
import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { VerifyEmailHandler } from './commands/handlers/verify-email.handler';
import { USER_REPOSITORY } from './domain/user.repository';
import { UserEmailVerifiedHandler } from './events/handlers/user-email-verified.handler';
import { UserPasswordChangedHandler } from './events/handlers/user-password-changed.handler';
import { UserRegisteredHandler } from './events/handlers/user-registered.handler';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { GetUserHandler } from './queries/handlers/get-user.handler';
import { ListUsersHandler } from './queries/handlers/list-users.handler';
import { UsersController } from './users.controller';

const CommandHandlers = [
  RegisterUserHandler,
  VerifyEmailHandler,
  ChangePasswordHandler,
];
const QueryHandlers = [GetUserHandler, ListUsersHandler];
const EventHandlers = [
  UserRegisteredHandler,
  UserEmailVerifiedHandler,
  UserPasswordChangedHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UsersModule {}
