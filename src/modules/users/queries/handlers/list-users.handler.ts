import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  PaginatedDto,
  PaginationOptionsDto,
} from '../../../../common/dto/pagination.dto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { UserResponseDto } from '../../dto/user-response.dto';
import { ListUsersQuery } from '../list-users.query';

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListUsersQuery): Promise<PaginatedDto<UserResponseDto>> {
    const options = Object.assign(new PaginationOptionsDto(), {
      page: query.page,
      limit: query.limit,
    });

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: options.skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    const data = users.map(
      (u) =>
        new UserResponseDto({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          isEmailVerified: u.isEmailVerified,
          createdAt: u.createdAt,
        }),
    );

    return new PaginatedDto(data, total, options);
  }
}
