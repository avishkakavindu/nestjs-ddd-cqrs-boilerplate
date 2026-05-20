import { NotFoundException, Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { USER_REPOSITORY } from '../../domain/user.repository';
import type { IUserRepository } from '../../domain/user.repository';
import { VerifyEmailCommand } from '../verify-email.command';

@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler implements ICommandHandler<VerifyEmailCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const user = await this.userRepo.findByVerificationToken(command.token);
    if (!user) throw new NotFoundException('Invalid verification token');

    // verifyEmail() validates token + expiry, returns a new verified aggregate, raises UserEmailVerifiedEvent
    const verified = user.verifyEmail(command.token);
    const ctx = this.publisher.mergeObjectContext(verified);

    await this.userRepo.save(ctx);
    ctx.commit();
  }
}
