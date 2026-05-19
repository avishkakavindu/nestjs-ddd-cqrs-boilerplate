import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { UserAggregate } from '../domain/user.aggregate';
import { IUserRepository } from '../domain/user.repository';

// Prisma implementation of IUserRepository.
// This is the only file in the users domain that imports PrismaService.
// Handlers and the Aggregate never touch Prisma directly.
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    if (!row) return null;

    return UserAggregate.reconstitute({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      passwordHash: row.passwordHash,
      isEmailVerified: row.isEmailVerified,
      googleId: row.googleId,
      refreshTokenHash: row.refreshTokenHash,
    });
  }

  async save(user: UserAggregate): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
        isEmailVerified: user.isEmailVerified,
        googleId: user.googleId,
        refreshTokenHash: user.refreshTokenHash,
      },
      update: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
        isEmailVerified: user.isEmailVerified,
        googleId: user.googleId,
        refreshTokenHash: user.refreshTokenHash,
      },
    });
  }
}
