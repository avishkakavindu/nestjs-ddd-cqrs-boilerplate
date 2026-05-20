import { ConflictException } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import { UserAggregate } from '../../domain/user.aggregate';
import type { IUserRepository } from '../../domain/user.repository';
import { RegisterUserCommand } from '../register-user.command';
import { RegisterUserHandler } from './register-user.handler';

describe('RegisterUserHandler', () => {
  let handler: RegisterUserHandler;
  let mockRepo: jest.Mocked<Pick<IUserRepository, 'findByEmail' | 'save'>>;
  let mockPublisher: { mergeObjectContext: jest.Mock };
  let fakeUser: UserAggregate;
  let registerSpy: jest.SpyInstance;
  let commitSpy: jest.Mock;

  beforeEach(() => {
    fakeUser = UserAggregate.reconstitute({
      id: 'user-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      passwordHash: 'hash',
      isEmailVerified: false,
      emailVerificationToken: 'token',
      emailVerificationTokenExpiry: new Date(),
      googleId: null,
      refreshTokenHash: null,
    });

    commitSpy = jest.fn();

    mockRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };

    mockPublisher = {
      mergeObjectContext: jest.fn().mockImplementation((agg: UserAggregate) => {
        agg.commit = commitSpy;
        return agg;
      }),
    };

    registerSpy = jest
      .spyOn(UserAggregate, 'register')
      .mockResolvedValue(fakeUser);

    handler = new RegisterUserHandler(
      mockRepo as unknown as IUserRepository,
      mockPublisher as unknown as EventPublisher,
    );
  });

  afterEach(() => {
    registerSpy.mockRestore();
  });

  it('returns id and email on success', async () => {
    const result = await handler.execute(
      new RegisterUserCommand('john@example.com', 'John', 'Doe', 'pass'),
    );
    expect(result).toEqual({ id: 'user-1', email: 'john@example.com' });
  });

  it('checks for a duplicate email before creating', async () => {
    await handler.execute(
      new RegisterUserCommand('john@example.com', 'John', 'Doe', 'pass'),
    );
    expect(mockRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
  });

  it('throws ConflictException if the email is already registered', async () => {
    mockRepo.findByEmail.mockResolvedValue(fakeUser);
    await expect(
      handler.execute(
        new RegisterUserCommand('john@example.com', 'John', 'Doe', 'pass'),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('saves the new user', async () => {
    await handler.execute(
      new RegisterUserCommand('john@example.com', 'John', 'Doe', 'pass'),
    );
    expect(mockRepo.save).toHaveBeenCalledWith(fakeUser);
  });

  it('merges EventBus context and commits events after save', async () => {
    await handler.execute(
      new RegisterUserCommand('john@example.com', 'John', 'Doe', 'pass'),
    );
    expect(mockPublisher.mergeObjectContext).toHaveBeenCalledWith(fakeUser);
    expect(commitSpy).toHaveBeenCalled();
  });
});
