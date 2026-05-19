import { NotFoundException, Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { USER_REPOSITORY } from '../../domain/user.repository';
import type { IUserRepository } from '../../domain/user.repository';
import { ChangePasswordCommand } from '../change-password.command';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const user = await this.userRepo.findById(command.userId);
    if (!user) throw new NotFoundException('User not found');

    // changePassword() verifies current password, hashes new one, raises UserPasswordChangedEvent
    const updated = this.publisher.mergeObjectContext(
      await user.changePassword(command.currentPassword, command.newPassword),
    );

    await this.userRepo.save(updated);
    updated.commit();
  }
}
