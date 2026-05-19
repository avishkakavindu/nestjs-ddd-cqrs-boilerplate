import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { UserAggregate } from '../../domain/user.aggregate';
import { RegisterUserCommand } from '../register-user.command';

// Command handler: the orchestrator. It does NOT contain business rules.
// Responsibilities: validate preconditions (duplicate check), call the Aggregate, persist the result.
// One handler per command. The CommandBus routes the command here by class reference.
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: RegisterUserCommand,
  ): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: command.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const user = await UserAggregate.register(command.email, command.password);

    await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
      },
    });

    return { id: user.id, email: user.email };
  }
}
