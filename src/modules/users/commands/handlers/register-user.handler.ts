import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserAggregate } from '../../domain/user.aggregate';
import { USER_REPOSITORY } from '../../domain/user.repository';
import type { IUserRepository } from '../../domain/user.repository';
import { RegisterUserCommand } from '../register-user.command';

// Command handler: the orchestrator. It does NOT contain business rules.
// Responsibilities: validate preconditions (duplicate check), call the Aggregate, persist the result.
// One handler per command. The CommandBus routes the command here by class reference.
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    command: RegisterUserCommand,
  ): Promise<{ id: string; email: string }> {
    const existing = await this.userRepo.findByEmail(command.email);
    if (existing) throw new ConflictException('Email already in use');

    const user = await UserAggregate.register(command.email, command.password);
    await this.userRepo.save(user);

    return { id: user.id, email: user.email };
  }
}
