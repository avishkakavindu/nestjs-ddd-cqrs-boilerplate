import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from '../../../../config/app-config.service';
import { UserAggregate } from '../../../users/domain/user.aggregate';
import type { IUserRepository } from '../../../users/domain/user.repository';
import { LoginCommand } from '../login.command';
import { LoginHandler } from './login.handler';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let mockRepo: jest.Mocked<Pick<IUserRepository, 'findByEmail' | 'save'>>;
  let mockJwtService: { sign: jest.Mock };
  let mockConfig: Pick<
    AppConfigService,
    'jwtRefreshSecret' | 'jwtRefreshExpiry'
  >;
  let fakeUser: UserAggregate;
  let updatedUser: UserAggregate;
  let validatePasswordSpy: jest.SpyInstance;
  let setRefreshTokenSpy: jest.SpyInstance;

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
      refreshTokenHash: null,
    });

    updatedUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hash',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      googleId: null,
      refreshTokenHash: 'hashed-refresh',
    });

    validatePasswordSpy = jest
      .spyOn(fakeUser, 'validatePassword')
      .mockResolvedValue(undefined);

    setRefreshTokenSpy = jest
      .spyOn(fakeUser, 'setRefreshToken')
      .mockResolvedValue(updatedUser);

    mockRepo = {
      findByEmail: jest.fn().mockResolvedValue(fakeUser),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockJwtService = {
      sign: jest
        .fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token'),
    };

    mockConfig = {
      jwtRefreshSecret: 'refresh-secret',
      jwtRefreshExpiry: '7d',
    };

    handler = new LoginHandler(
      mockRepo as unknown as IUserRepository,
      mockJwtService as unknown as JwtService,
      mockConfig as unknown as AppConfigService,
    );
  });

  afterEach(() => {
    validatePasswordSpy.mockRestore();
    setRefreshTokenSpy.mockRestore();
  });

  it('looks up the user by email', async () => {
    await handler.execute(new LoginCommand('john@example.com', 'pass'));
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
  });

  it('throws NotFoundException if user does not exist', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    await expect(
      handler.execute(new LoginCommand('unknown@example.com', 'pass')),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates password validation to the aggregate', async () => {
    await handler.execute(new LoginCommand('john@example.com', 'pass'));
    expect(validatePasswordSpy).toHaveBeenCalledWith('pass');
  });

  it('signs access and refresh tokens with correct payloads', async () => {
    await handler.execute(new LoginCommand('john@example.com', 'pass'));
    expect(mockJwtService.sign).toHaveBeenNthCalledWith(1, {
      sub: 'user-1',
      email: 'john@example.com',
    });
    expect(mockJwtService.sign).toHaveBeenNthCalledWith(
      2,
      { sub: 'user-1', email: 'john@example.com' },
      { secret: 'refresh-secret', expiresIn: '7d' },
    );
  });

  it('saves the updated aggregate and returns tokens', async () => {
    const result = await handler.execute(
      new LoginCommand('john@example.com', 'pass'),
    );
    expect(setRefreshTokenSpy).toHaveBeenCalledWith('refresh-token');
    expect(mockRepo.save).toHaveBeenCalledWith(updatedUser);
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });
});
