import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { ChangePasswordCommand } from './commands/change-password.command';
import { RegisterUserCommand } from './commands/register-user.command';
import { VerifyEmailCommand } from './commands/verify-email.command';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterUserDto) {
    return this.commandBus.execute(
      new RegisterUserCommand(
        dto.email,
        dto.firstName,
        dto.lastName,
        dto.password,
      ),
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.commandBus.execute(new VerifyEmailCommand(dto.token));
  }

  // TODO: replace :id param with @CurrentUser() decorator once JWT (step 19) is built
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.commandBus.execute(
      new ChangePasswordCommand(id, dto.currentPassword, dto.newPassword),
    );
  }
}
