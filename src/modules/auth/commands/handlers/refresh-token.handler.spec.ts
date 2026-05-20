import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserAggregate } from '../../../users/domain/user.aggregate';
import type { IUserRepository } from '../../../users/domain/user.repository';
import { RefreshTokenCommand } from '../refresh-token.command';
import { RefreshTokenHandler } from './refresh-token.handler';

// bcrypt is a native addon — its properties are non-configurable, so spyOn
// cannot replace them. jest.mock hoists a full auto-mock before any imports run.
jest.mock('bcrypt');

const mockedBcryptCompare = jest.mocked(bcrypt.compare);

describe('RefreshTokenHandler', () => {
  let handler: RefreshTokenHandler;
  let mockRepo: jest.Mocked<Pick<IUserRepository, 'findById'>>;
  let mockJwtService: { sign: jest.Mock };
  let fakeUser: UserAggregate;

  beforeEach(() => {
    fakeUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hash',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      googleId: null,
      refreshTokenHash: 'stored-refresh-hash',
    });

    mockedBcryptCompare.mockResolvedValue(true as never);

    mockRepo = {
      findById: jest.fn().mockResolvedValue(fakeUser),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('new-access-token'),
    };

    handler = new RefreshTokenHandler(
      mockRepo as unknown as IUserRepository,
      mockJwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('looks up the user by id', async () => {
    await handler.execute(new RefreshTokenCommand('user-1', 'raw-token'));
    expect(mockRepo.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws NotFoundException if user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      handler.execute(new RefreshTokenCommand('user-1', 'raw-token')),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws UnauthorizedException if user has no stored refresh token', async () => {
    const noTokenUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hash',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      googleId: null,
      refreshTokenHash: null,
    });
    mockRepo.findById.mockResolvedValue(noTokenUser);
    await expect(
      handler.execute(new RefreshTokenCommand('user-1', 'raw-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if raw token does not match stored hash', async () => {
    mockedBcryptCompare.mockResolvedValue(false as never);
    await expect(
      handler.execute(new RefreshTokenCommand('user-1', 'wrong-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns a new access token on success', async () => {
    const result = await handler.execute(
      new RefreshTokenCommand('user-1', 'raw-token'),
    );
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'john@example.com',
    });
    expect(result).toEqual({ accessToken: 'new-access-token' });
  });
});
