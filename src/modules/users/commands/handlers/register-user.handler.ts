import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../../../prisma/prisma.service';
import { RegisterUserCommand } from '../register-user.command';

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: RegisterUserCommand,
  ): Promise<{ id: string; email: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: command.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(command.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: command.email,
        passwordHash,
      },
    });

    return { id: user.id, email: user.email };
  }
}
