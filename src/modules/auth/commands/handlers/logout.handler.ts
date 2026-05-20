import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { IUserRepository } from '../../../users/domain/user.repository';
import { LogoutCommand } from '../logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async execute(command: LogoutCommand) {
    const user = await this.users.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    const updated = user.clearRefreshToken();
    await this.users.save(updated);
  }
}
