import { AggregateRoot } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';

import { UserRegisteredEvent } from '../events/user-registered.event';

interface UserProps {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string | null;
  isEmailVerified: boolean;
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
    const user = new UserAggregate({
      id: crypto.randomUUID(),
      email,
      firstName,
      lastName,
      passwordHash,
      isEmailVerified: false,
      googleId: null,
      refreshTokenHash: null,
    });
    user.apply(new UserRegisteredEvent(user.id, user.email));
    return user;
  }

  // Called when loading an existing user from the DB - no rules, just restore state
  static reconstitute(props: UserProps): UserAggregate {
    return new UserAggregate(props);
  }
}
