import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RegisterUserHandler } from './commands/handlers/register-user.handler';
import { USER_REPOSITORY } from './domain/user.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { UsersController } from './users.controller';

const CommandHandlers = [RegisterUserHandler];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    ...CommandHandlers,
    // Bind the domain interface token to the Prisma implementation.
    // Swap useClass here to change the DB without touching handlers.
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UsersModule {}
