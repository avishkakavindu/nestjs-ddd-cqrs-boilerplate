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

  private toAggregate(row: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string | null;
    isEmailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiry: Date | null;
    googleId: string | null;
    refreshTokenHash: string | null;
  }): UserAggregate {
    return UserAggregate.reconstitute({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      passwordHash: row.passwordHash,
      isEmailVerified: row.isEmailVerified,
      emailVerificationToken: row.emailVerificationToken,
      emailVerificationTokenExpiry: row.emailVerificationTokenExpiry,
      googleId: row.googleId,
      refreshTokenHash: row.refreshTokenHash,
    });
  }

  async findById(id: string): Promise<UserAggregate | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toAggregate(row) : null;
  }

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toAggregate(row) : null;
  }

  async findByVerificationToken(token: string): Promise<UserAggregate | null> {
    const row = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
    return row ? this.toAggregate(row) : null;
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
        emailVerificationToken: user.emailVerificationToken,
        emailVerificationTokenExpiry: user.emailVerificationTokenExpiry,
        googleId: user.googleId,
        refreshTokenHash: user.refreshTokenHash,
      },
      update: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash: user.passwordHash,
        isEmailVerified: user.isEmailVerified,
        emailVerificationToken: user.emailVerificationToken,
        emailVerificationTokenExpiry: user.emailVerificationTokenExpiry,
        googleId: user.googleId,
        refreshTokenHash: user.refreshTokenHash,
      },
    });
  }
}
