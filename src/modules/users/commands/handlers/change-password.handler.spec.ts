import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { UserAggregate } from '../../domain/user.aggregate';
import type { IUserRepository } from '../../domain/user.repository';
import { ChangePasswordCommand } from '../change-password.command';
import { ChangePasswordHandler } from './change-password.handler';

describe('ChangePasswordHandler', () => {
  let handler: ChangePasswordHandler;
  let mockRepo: jest.Mocked<Pick<IUserRepository, 'findById' | 'save'>>;
  let mockPublisher: { mergeObjectContext: jest.Mock };
  let fakeUser: UserAggregate;
  let updatedUser: UserAggregate;
  let commitSpy: jest.Mock;
  let changePasswordSpy: jest.SpyInstance;

  beforeEach(() => {
    fakeUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'old-hash',
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
      passwordHash: 'new-hash',
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      googleId: null,
      refreshTokenHash: null,
    });

    commitSpy = jest.fn();
    changePasswordSpy = jest
      .spyOn(fakeUser, 'changePassword')
      .mockResolvedValue(updatedUser);

    mockRepo = {
      findById: jest.fn().mockResolvedValue(fakeUser),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((agg: UserAggregate) => {
        agg.commit = commitSpy;
        return agg;
      }),
    };

    handler = new ChangePasswordHandler(
      mockRepo as unknown as IUserRepository,
      mockPublisher as unknown as EventPublisher,
    );
  });

  afterEach(() => {
    changePasswordSpy.mockRestore();
  });

  it('looks up the user by id', async () => {
    await handler.execute(
      new ChangePasswordCommand('user-1', 'oldpass', 'newpass'),
    );
    expect(mockRepo.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws NotFoundException if user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      handler.execute(
        new ChangePasswordCommand('user-1', 'oldpass', 'newpass'),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates password change to the aggregate', async () => {
    await handler.execute(
      new ChangePasswordCommand('user-1', 'oldpass', 'newpass'),
    );
    expect(changePasswordSpy).toHaveBeenCalledWith('oldpass', 'newpass');
  });

  it('saves the updated aggregate and commits events', async () => {
    await handler.execute(
      new ChangePasswordCommand('user-1', 'oldpass', 'newpass'),
    );
    expect(mockRepo.save).toHaveBeenCalledWith(updatedUser);
    expect(commitSpy).toHaveBeenCalled();
  });
});
