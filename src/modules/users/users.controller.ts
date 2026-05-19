import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { PaginationOptionsDto } from '../../common/dto/pagination.dto';
import { ChangePasswordCommand } from './commands/change-password.command';
import { RegisterUserCommand } from './commands/register-user.command';
import { VerifyEmailCommand } from './commands/verify-email.command';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GetUserQuery } from './queries/get-user.query';
import { ListUsersQuery } from './queries/list-users.query';

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

  @Get('')
  listUsers(@Query() pagination: PaginationOptionsDto) {
    return this.queryBus.execute(
      new ListUsersQuery(pagination.page, pagination.limit),
    );
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.queryBus.execute(new GetUserQuery(id));
  }
}
