import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UserEmailVerifiedEvent } from '../events/user-email-verified.event';
import { UserPasswordChangedEvent } from '../events/user-password-changed.event';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserAggregate } from './user.aggregate';

// The Aggregate is pure TypeScript — no NestJS DI, no DB, no mocks needed.
// Tests here prove that business rules are enforced and domain events are raised correctly.

const PASSWORD = 'SecurePass123!';
let passwordHash: string;

// Build a verified password user — the baseline for most tests.
function makeUser(
  overrides: Partial<{
    isEmailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiry: Date | null;
    passwordHash: string | null;
    googleId: string | null;
    refreshTokenHash: string | null;
  }> = {},
): UserAggregate {
  return UserAggregate.reconstitute({
    id: 'user-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash,
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiry: null,
    googleId: null,
    refreshTokenHash: null,
    ...overrides,
  });
}

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 10);
});

describe('UserAggregate.register', () => {
  it('hashes the password — never stores plain text', async () => {
    const user = await UserAggregate.register(
      'a@b.com',
      'Alice',
      'Smith',
      PASSWORD,
    );
    expect(user.passwordHash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, user.passwordHash!)).toBe(true);
  });

  it('creates an unverified user with a verification token', async () => {
    const user = await UserAggregate.register(
      'a@b.com',
      'Alice',
      'Smith',
      PASSWORD,
    );
    expect(user.isEmailVerified).toBe(false);
    expect(user.emailVerificationToken).toBeTruthy();
    expect(user.emailVerificationTokenExpiry).toBeInstanceOf(Date);
  });

  it('sets expiry ~24h from now', async () => {
    const before = Date.now();
    const user = await UserAggregate.register(
      'a@b.com',
      'Alice',
      'Smith',
      PASSWORD,
    );
    const after = Date.now();
    const expiry = user.emailVerificationTokenExpiry!.getTime();
    expect(expiry).toBeGreaterThanOrEqual(before + 23 * 60 * 60 * 1000);
    expect(expiry).toBeLessThanOrEqual(after + 25 * 60 * 60 * 1000);
  });

  it('queues a UserRegisteredEvent with correct fields', async () => {
    const user = await UserAggregate.register(
      'a@b.com',
      'Alice',
      'Smith',
      PASSWORD,
    );
    const events = user.getUncommittedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as UserRegisteredEvent;
    expect(event).toBeInstanceOf(UserRegisteredEvent);
    expect(event.email).toBe('a@b.com');
    expect(event.firstName).toBe('Alice');
    expect(event.emailVerificationToken).toBe(user.emailVerificationToken);
  });
});

describe('UserAggregate.registerViaGoogle', () => {
  it('marks email as verified — Google already verified it', () => {
    const user = UserAggregate.registerViaGoogle(
      'g-123',
      'a@b.com',
      'Alice',
      'Smith',
    );
    expect(user.isEmailVerified).toBe(true);
  });

  it('has no password hash — social login only', () => {
    const user = UserAggregate.registerViaGoogle(
      'g-123',
      'a@b.com',
      'Alice',
      'Smith',
    );
    expect(user.passwordHash).toBeNull();
  });

  it('stores the googleId', () => {
    const user = UserAggregate.registerViaGoogle(
      'g-123',
      'a@b.com',
      'Alice',
      'Smith',
    );
    expect(user.googleId).toBe('g-123');
  });

  it('does not queue any domain events', () => {
    const user = UserAggregate.registerViaGoogle(
      'g-123',
      'a@b.com',
      'Alice',
      'Smith',
    );
    expect(user.getUncommittedEvents()).toHaveLength(0);
  });
});

describe('UserAggregate.verifyEmail', () => {
  const token = 'valid-token-abc';
  const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);

  it('returns a new aggregate with isEmailVerified true and token cleared', () => {
    const user = makeUser({
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: futureExpiry,
    });
    const verified = user.verifyEmail(token);
    expect(verified.isEmailVerified).toBe(true);
    expect(verified.emailVerificationToken).toBeNull();
    expect(verified.emailVerificationTokenExpiry).toBeNull();
  });

  it('does not mutate the original aggregate', () => {
    const user = makeUser({
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: futureExpiry,
    });
    user.verifyEmail(token);
    expect(user.isEmailVerified).toBe(false);
  });

  it('queues UserEmailVerifiedEvent on the returned aggregate', () => {
    const user = makeUser({
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: futureExpiry,
    });
    const verified = user.verifyEmail(token);
    const events = verified.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserEmailVerifiedEvent);
  });

  it('throws BadRequestException if email is already verified', () => {
    const user = makeUser({ isEmailVerified: true });
    expect(() => user.verifyEmail(token)).toThrow(BadRequestException);
  });

  it('throws UnauthorizedException if token does not match', () => {
    const user = makeUser({
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: futureExpiry,
    });
    expect(() => user.verifyEmail('wrong-token')).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException if token is expired', () => {
    const user = makeUser({
      isEmailVerified: false,
      emailVerificationToken: token,
      emailVerificationTokenExpiry: new Date(Date.now() - 1000),
    });
    expect(() => user.verifyEmail(token)).toThrow(UnauthorizedException);
  });
});

describe('UserAggregate.validatePassword', () => {
  it('resolves without error when password is correct', async () => {
    const user = makeUser();
    await expect(user.validatePassword(PASSWORD)).resolves.toBeUndefined();
  });

  it('throws UnauthorizedException for wrong password', async () => {
    const user = makeUser();
    await expect(user.validatePassword('wrongpass')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException if email is not verified', async () => {
    const user = makeUser({ isEmailVerified: false });
    await expect(user.validatePassword(PASSWORD)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for social login accounts', async () => {
    const user = makeUser({ passwordHash: null });
    await expect(user.validatePassword(PASSWORD)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('UserAggregate.changePassword', () => {
  it('returns a new aggregate with a new password hash', async () => {
    const user = makeUser();
    const updated = await user.changePassword(PASSWORD, 'NewPass456!');
    expect(updated.passwordHash).not.toBe(user.passwordHash);
    expect(await bcrypt.compare('NewPass456!', updated.passwordHash!)).toBe(
      true,
    );
  });

  it('queues UserPasswordChangedEvent', async () => {
    const user = makeUser();
    const updated = await user.changePassword(PASSWORD, 'NewPass456!');
    const events = updated.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserPasswordChangedEvent);
  });

  it('does not mutate the original aggregate', async () => {
    const user = makeUser();
    const originalHash = user.passwordHash;
    await user.changePassword(PASSWORD, 'NewPass456!');
    expect(user.passwordHash).toBe(originalHash);
  });

  it('throws UnauthorizedException for wrong current password', async () => {
    const user = makeUser();
    await expect(
      user.changePassword('wrongpass', 'NewPass456!'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException for social login accounts', async () => {
    const user = makeUser({ passwordHash: null });
    await expect(user.changePassword(PASSWORD, 'NewPass456!')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('UserAggregate.setRefreshToken', () => {
  it('stores a hash — not the raw token', async () => {
    const user = makeUser();
    const raw = 'my-refresh-token';
    const updated = await user.setRefreshToken(raw);
    expect(updated.refreshTokenHash).not.toBe(raw);
    expect(await bcrypt.compare(raw, updated.refreshTokenHash!)).toBe(true);
  });

  it('does not mutate the original aggregate', async () => {
    const user = makeUser();
    await user.setRefreshToken('some-token');
    expect(user.refreshTokenHash).toBeNull();
  });
});

describe('UserAggregate.clearRefreshToken', () => {
  it('returns a new aggregate with null refreshTokenHash', async () => {
    const user = makeUser();
    const withToken = await user.setRefreshToken('some-token');
    const cleared = withToken.clearRefreshToken();
    expect(cleared.refreshTokenHash).toBeNull();
  });

  it('does not mutate the original aggregate', async () => {
    const user = await makeUser().setRefreshToken('some-token');
    user.clearRefreshToken();
    expect(user.refreshTokenHash).not.toBeNull();
  });
});

describe('UserAggregate.linkGoogleAccount', () => {
  it('returns a new aggregate with the googleId set', () => {
    const user = makeUser();
    const linked = user.linkGoogleAccount('g-456');
    expect(linked.googleId).toBe('g-456');
  });

  it('preserves all other fields', () => {
    const user = makeUser();
    const linked = user.linkGoogleAccount('g-456');
    expect(linked.id).toBe(user.id);
    expect(linked.email).toBe(user.email);
    expect(linked.passwordHash).toBe(user.passwordHash);
  });

  it('does not mutate the original aggregate', () => {
    const user = makeUser();
    user.linkGoogleAccount('g-456');
    expect(user.googleId).toBeNull();
  });
});
