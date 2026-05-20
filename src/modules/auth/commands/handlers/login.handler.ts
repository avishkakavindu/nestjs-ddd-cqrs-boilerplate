import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';

import type { StringValue } from 'ms';

import { AppConfigService } from '../../../../config/app-config.service';
import { USER_REPOSITORY } from '../../../users/domain/user.repository';
import type { IUserRepository } from '../../../users/domain/user.repository';
import { LoginCommand } from '../login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async execute(command: LoginCommand) {
    const user = await this.users.findByEmail(command.email);
    if (!user) throw new NotFoundException('Invalid credentials');

    await user.validatePassword(command.password);

    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);

    // Refresh token uses its own secret and expiry — sign() overrides the JwtModule defaults.
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiry as StringValue,
    });

    const updated = await user.setRefreshToken(refreshToken);
    await this.users.save(updated);

    return { accessToken, refreshToken };
  }
}
