import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AggregateRoot } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';

import { UserEmailVerifiedEvent } from '../events/user-email-verified.event';
import { UserPasswordChangedEvent } from '../events/user-password-changed.event';
import { UserRegisteredEvent } from '../events/user-registered.event';

interface UserProps {
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
}

// Aggregate root: owns all business rules for the User domain. No Prisma, no HTTP - pure TypeScript.
// The handler orchestrates (load, call, save). The Aggregate decides (what's valid, what state changes).
export class UserAggregate extends AggregateRoot {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly passwordHash: string | null;
  readonly isEmailVerified: boolean;
  readonly emailVerificationToken: string | null;
  readonly emailVerificationTokenExpiry: Date | null;
  readonly googleId: string | null;
  readonly refreshTokenHash: string | null;

  private constructor(props: UserProps) {
    super();
    this.id = props.id;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.passwordHash = props.passwordHash;
    this.isEmailVerified = props.isEmailVerified;
    this.emailVerificationToken = props.emailVerificationToken;
    this.emailVerificationTokenExpiry = props.emailVerificationTokenExpiry;
    this.googleId = props.googleId;
    this.refreshTokenHash = props.refreshTokenHash;
  }

  // Called when a new user registers - runs business rules, generates identity, queues domain event
  static async register(
    email: string,
    firstName: string,
    lastName: string,
    password: string,
  ): Promise<UserAggregate> {
    const passwordHash = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomUUID();
    const emailVerificationTokenExpiry = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ); // 24h

    const user = new UserAggregate({
      id: crypto.randomUUID(),
      email,
      firstName,
      lastName,
      passwordHash,
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpiry,
      googleId: null,
      refreshTokenHash: null,
    });
    user.apply(
      new UserRegisteredEvent(
        user.id,
        user.email,
        user.firstName,
        emailVerificationToken,
      ),
    );
    return user;
  }

  // Called when loading an existing user from the DB - no rules, just restore state
  static reconstitute(props: UserProps): UserAggregate {
    return new UserAggregate(props);
  }

  // Google verified the email, so isEmailVerified is true from the start.
  // No password — social login only until the user sets one.
  static registerViaGoogle(
    googleId: string,
    email: string,
    firstName: string,
    lastName: string,
  ): UserAggregate {
    return new UserAggregate({
      id: crypto.randomUUID(),
      email,
      firstName,
      lastName,
      passwordHash: null,
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
      googleId,
      refreshTokenHash: null,
    });
  }

  // Called when a password user signs in with Google for the first time — links the accounts.
  linkGoogleAccount(googleId: string): UserAggregate {
    return UserAggregate.reconstitute({ ...this.toProps(), googleId });
  }

  verifyEmail(token: string): UserAggregate {
    if (this.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    if (this.emailVerificationToken !== token) {
      throw new UnauthorizedException('Invalid verification token');
    }
    if (
      !this.emailVerificationTokenExpiry ||
      this.emailVerificationTokenExpiry < new Date()
    ) {
      throw new UnauthorizedException('Verification token has expired');
    }
    const verified = UserAggregate.reconstitute({
      ...this.toProps(),
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null,
    });
    verified.apply(
      new UserEmailVerifiedEvent(this.id, this.email, this.firstName),
    );
    return verified;
  }

  async validatePassword(password: string): Promise<void> {
    if (!this.passwordHash) {
      throw new UnauthorizedException(
        'Account uses social login — no password set',
      );
    }
    if (!this.isEmailVerified) {
      throw new UnauthorizedException('Email is not verified');
    }
    const matches = await bcrypt.compare(password, this.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async setRefreshToken(rawToken: string): Promise<UserAggregate> {
    const hash = await bcrypt.hash(rawToken, 10);
    return UserAggregate.reconstitute({
      ...this.toProps(),
      refreshTokenHash: hash,
    });
  }

  clearRefreshToken(): UserAggregate {
    return UserAggregate.reconstitute({
      ...this.toProps(),
      refreshTokenHash: null,
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<UserAggregate> {
    if (!this.passwordHash) {
      throw new BadRequestException(
        'Account uses social login — no password to change',
      );
    }
    const matches = await bcrypt.compare(currentPassword, this.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    const updated = UserAggregate.reconstitute({
      ...this.toProps(),
      passwordHash: newHash,
    });
    updated.apply(new UserPasswordChangedEvent(this.id));
    return updated;
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      passwordHash: this.passwordHash,
      isEmailVerified: this.isEmailVerified,
      emailVerificationToken: this.emailVerificationToken,
      emailVerificationTokenExpiry: this.emailVerificationTokenExpiry,
      googleId: this.googleId,
      refreshTokenHash: this.refreshTokenHash,
    };
  }
}
