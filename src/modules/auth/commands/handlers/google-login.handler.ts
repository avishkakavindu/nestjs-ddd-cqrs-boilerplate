import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { AppConfigService } from '../../../../config/app-config.service';
import { UserAggregate } from '../../../users/domain/user.aggregate';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { IUserRepository } from '../../../users/domain/user.repository';
import { GoogleLoginCommand } from '../google-login.command';

@CommandHandler(GoogleLoginCommand)
export class GoogleLoginHandler implements ICommandHandler<GoogleLoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async execute(command: GoogleLoginCommand) {
    let user = await this.users.findByGoogleId(command.googleId);

    if (!user) {
      const existing = await this.users.findByEmail(command.email);

      if (existing) {
        // Password user logging in with Google for the first time — link the accounts.
        user = existing.linkGoogleAccount(command.googleId);
      } else {
        // Brand new user — Google verified their email so skip the verification step.
        user = UserAggregate.registerViaGoogle(
          command.googleId,
          command.email,
          command.firstName,
          command.lastName,
        );
      }
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiry as StringValue,
    });

    const updated = await user.setRefreshToken(refreshToken);
    await this.users.save(updated);

    return { accessToken, refreshToken };
  }
}
