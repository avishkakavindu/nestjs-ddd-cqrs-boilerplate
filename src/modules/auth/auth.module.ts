import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { AppConfigModule } from '../../config/config.module';
import { AppConfigService } from '../../config/app-config.service';
import { UsersModule } from '../users/users.module';
import { GoogleLoginHandler } from './commands/handlers/google-login.handler';
import { LoginHandler } from './commands/handlers/login.handler';
import { LogoutHandler } from './commands/handlers/logout.handler';
import { RefreshTokenHandler } from './commands/handlers/refresh-token.handler';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { AuthController } from './auth.controller';

const CommandHandlers = [
  LoginHandler,
  LogoutHandler,
  RefreshTokenHandler,
  GoogleLoginHandler,
];

// AuthModule owns all authentication infrastructure.
// UsersModule is imported to access IUserRepository (needed by auth command handlers).
// JwtModule is exported so other modules can inject JwtService if needed.
@Module({
  imports: [
    CqrsModule,
    PassportModule,
    AppConfigModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: { expiresIn: config.jwtAccessExpiry as StringValue },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    ...CommandHandlers,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    GoogleStrategy,
  ],
  exports: [JwtModule],
})
export class AuthModule {}
