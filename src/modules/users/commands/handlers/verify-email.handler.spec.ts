import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { UserAggregate } from '../../domain/user.aggregate';
import type { IUserRepository } from '../../domain/user.repository';
import { VerifyEmailCommand } from '../verify-email.command';
import { VerifyEmailHandler } from './verify-email.handler';

describe('VerifyEmailHandler', () => {
  let handler: VerifyEmailHandler;
  let mockRepo: jest.Mocked<
    Pick<IUserRepository, 'findByVerificationToken' | 'save'>
  >;
  let mockPublisher: { mergeObjectContext: jest.Mock };
  let fakeUser: UserAggregate;
  let verifiedUser: UserAggregate;
  let commitSpy: jest.Mock;
  let verifyEmailSpy: jest.SpyInstance;

  beforeEach(() => {
    fakeUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: null,
      isEmailVerified: false,
      emailVerificationToken: 'valid-token',
      emailVerificationTokenExpiry: new Date(Date.now() + 3600_000),
      googleId: null,
      refreshTokenHash: null,
    });

    verifiedUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: null,
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      googleId: null,
      refreshTokenHash: null,
    });

    commitSpy = jest.fn();
    verifyEmailSpy = jest
      .spyOn(fakeUser, 'verifyEmail')
      .mockReturnValue(verifiedUser);

    mockRepo = {
      findByVerificationToken: jest.fn().mockResolvedValue(fakeUser),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((agg: UserAggregate) => {
        agg.commit = commitSpy;
        return agg;
      }),
    };

    handler = new VerifyEmailHandler(
      mockRepo as unknown as IUserRepository,
      mockPublisher as unknown as EventPublisher,
    );
  });

  afterEach(() => {
    verifyEmailSpy.mockRestore();
  });

  it('looks up the user by verification token', async () => {
    await handler.execute(new VerifyEmailCommand('valid-token'));
    expect(mockRepo.findByVerificationToken).toHaveBeenCalledWith(
      'valid-token',
    );
  });

  it('throws NotFoundException if token is not found', async () => {
    mockRepo.findByVerificationToken.mockResolvedValue(null);
    await expect(
      handler.execute(new VerifyEmailCommand('bad-token')),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates email verification to the aggregate', async () => {
    await handler.execute(new VerifyEmailCommand('valid-token'));
    expect(verifyEmailSpy).toHaveBeenCalledWith('valid-token');
  });

  it('saves the verified aggregate and commits events', async () => {
    await handler.execute(new VerifyEmailCommand('valid-token'));
    expect(mockRepo.save).toHaveBeenCalledWith(verifiedUser);
    expect(commitSpy).toHaveBeenCalled();
  });
});
