import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../prisma/prisma.service';
import { UserResponseDto } from '../../dto/user-response.dto';
import { GetUserQuery } from '../get-user.query';

// Query handler: read-only, no Aggregate, no business rules.
// Queries the DB directly and returns a DTO - optimized for the question, not domain correctness.
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserQuery): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: query.id } });
    if (!user) throw new NotFoundException('User not found');

    return new UserResponseDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    });
  }
}
