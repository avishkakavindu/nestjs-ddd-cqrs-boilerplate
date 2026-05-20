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

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
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

  @Public()
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

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.commandBus.execute(new VerifyEmailCommand(dto.token));
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.commandBus.execute(
      new ChangePasswordCommand(user.sub, dto.currentPassword, dto.newPassword),
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
