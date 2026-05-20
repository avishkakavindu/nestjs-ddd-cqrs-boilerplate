import { NotFoundException } from '@nestjs/common';

import { UserAggregate } from '../../../users/domain/user.aggregate';
import type { IUserRepository } from '../../../users/domain/user.repository';
import { LogoutCommand } from '../logout.command';
import { LogoutHandler } from './logout.handler';

describe('LogoutHandler', () => {
  let handler: LogoutHandler;
  let mockRepo: jest.Mocked<Pick<IUserRepository, 'findById' | 'save'>>;
  let fakeUser: UserAggregate;
  let clearedUser: UserAggregate;
  let clearRefreshTokenSpy: jest.SpyInstance;

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
      refreshTokenHash: 'some-hash',
    });

    clearedUser = UserAggregate.reconstitute({
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

    clearRefreshTokenSpy = jest
      .spyOn(fakeUser, 'clearRefreshToken')
      .mockReturnValue(clearedUser);

    mockRepo = {
      findById: jest.fn().mockResolvedValue(fakeUser),
      save: jest.fn().mockResolvedValue(undefined),
    };

    handler = new LogoutHandler(mockRepo as unknown as IUserRepository);
  });

  afterEach(() => {
    clearRefreshTokenSpy.mockRestore();
  });

  it('looks up the user by id', async () => {
    await handler.execute(new LogoutCommand('user-1'));
    expect(mockRepo.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws NotFoundException if user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(handler.execute(new LogoutCommand('user-1'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('delegates clearRefreshToken to the aggregate', async () => {
    await handler.execute(new LogoutCommand('user-1'));
    expect(clearRefreshTokenSpy).toHaveBeenCalled();
  });

  it('saves the cleared aggregate', async () => {
    await handler.execute(new LogoutCommand('user-1'));
    expect(mockRepo.save).toHaveBeenCalledWith(clearedUser);
  });
});
