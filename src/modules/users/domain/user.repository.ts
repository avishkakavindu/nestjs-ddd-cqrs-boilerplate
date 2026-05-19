import { UserAggregate } from './user.aggregate';

// Repository interface: defines what persistence operations the domain needs.
// Lives in the domain layer — no Prisma, no infrastructure imports.
// The handler depends on this interface, not the Prisma implementation.
// This is the boundary between domain and infrastructure.
export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findById(id: string): Promise<UserAggregate | null>;
  findByEmail(email: string): Promise<UserAggregate | null>;
  findByVerificationToken(token: string): Promise<UserAggregate | null>;
  save(user: UserAggregate): Promise<void>;
}
