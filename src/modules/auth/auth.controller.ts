import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LoginCommand } from './commands/login.command';
import { LogoutCommand } from './commands/logout.command';
import { RefreshTokenCommand } from './commands/refresh-token.command';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { JwtPayload, JwtRefreshPayload } from './jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: JwtPayload) {
    return this.commandBus.execute(new LogoutCommand(user.sub));
  }

  // @Public() skips the global JwtAuthGuard (which checks access tokens).
  // @UseGuards(JwtRefreshGuard) then runs the refresh token strategy instead.
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: JwtRefreshPayload) {
    return this.commandBus.execute(
      new RefreshTokenCommand(user.sub, user.refreshToken),
    );
  }
}
