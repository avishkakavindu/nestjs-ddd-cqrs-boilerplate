# Patterns Used in This Project

This document explains every architectural pattern used in this boilerplate — what it is, the problem it solves, and a real-world example. No prior knowledge of DDD or CQRS assumed.

---

## The Problem These Patterns Solve

Imagine you start a project. You have a `UserService` with methods like `register()`, `login()`, `getUser()`, `changePassword()`, `verifyEmail()`. It works fine.

Six months later, that service has 800 lines. It talks to the database, sends emails, validates business rules, hashes passwords, and formats responses — all mixed together. A new developer can't tell what's a business rule and what's infrastructure. Testing requires mocking five things. Changing the database means touching the service.

The patterns in this project prevent that from happening by giving every piece of logic a **single, well-defined home**.

---

## 1. CQRS — Command Query Responsibility Segregation

### What it is

Split every operation into one of two types:

- **Command** — changes something. Register a user, change a password, place an order.
- **Query** — reads something. Get a user profile, list all orders, search products.

They are handled by completely separate code paths.

### The problem it solves

In a traditional service, the same method often reads AND writes, or the read methods start borrowing write-side logic. They grow together and become hard to change independently.

With CQRS, the write side can have complex domain logic while the read side stays as simple as a database query returning a DTO. You can optimize them independently — scale them separately, cache reads without worrying about writes.

### Real-world example

Think of a **restaurant**:

- A **waiter** takes your order (Command) and brings food. They don't cook.
- A **menu** shows available items (Query). It doesn't take orders.

Two different jobs. The menu doesn't need to know how the kitchen works. The kitchen doesn't need to know how menus are printed.

### How it looks in this project

```
Write side:
  POST /users/register
    → RegisterUserCommand
    → RegisterUserHandler (orchestrates)
    → UserAggregate (business rules)
    → PrismaUserRepository (saves to DB)

Read side (coming in step 18):
  GET /users/:id
    → GetUserQuery
    → GetUserHandler (queries DB directly, no Aggregate)
    → returns UserDto
```

### What it does NOT mean

CQRS does not require separate databases, event sourcing, or microservices. In this project, both sides use the same PostgreSQL database. CQRS is just a code organization principle.

---

## 2. Commands and Queries — Plain Data Objects

### What they are

A Command or Query is just a plain TypeScript class that carries data. No logic, no methods, no decorators.

```typescript
export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly password: string,
  ) {}
}
```

### The problem it solves

Without commands, the controller talks directly to a service. The controller now knows which service to call, what method to invoke, and what parameters it needs. If you want to trigger the same operation from a scheduled job or a message queue, you have to duplicate that knowledge.

A Command decouples the **trigger** (HTTP request, cron job, message queue) from the **handler**. Anything that can create a `RegisterUserCommand` can trigger registration — the controller doesn't care, the handler doesn't know.

### Real-world example

Think of a **work ticket** in a system like Jira:

- The ticket carries all the information needed to do the work (what, who, details).
- It doesn't care who picks it up or how they do it.
- A developer, a contractor, or an automated bot can all pick up and complete the same ticket.

A Command is that ticket.

---

## 3. Command Handlers and Query Handlers

### What they are

A handler is the class that processes one specific Command or Query. One command = one handler. One query = one handler.

```typescript
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  async execute(command: RegisterUserCommand) {
    // orchestrate: check preconditions, call Aggregate, save, publish events
  }
}
```

### The problem it solves

In a traditional service, one class handles dozens of operations. A handler has exactly one job. It is easy to find, easy to test, and changing it affects nothing else.

### What belongs in a handler

| Belongs in handler                              | Does NOT belong in handler                  |
| ----------------------------------------------- | ------------------------------------------- |
| DB precondition checks (does this email exist?) | Business rules (password hashing algorithm) |
| Calling the Aggregate                           | Deciding initial user state                 |
| Saving via repository                           | HTTP response formatting                    |
| Publishing domain events                        | Sending emails directly                     |

### Real-world example

Think of a **bank teller**:

- A teller processes one transaction at a time.
- They verify your identity (precondition check).
- They hand the request to the vault system (Aggregate/repository).
- They don't decide the interest rate (business rule — that lives in the Aggregate).
- They don't print the annual report (that's a query concern).

---

## 4. The Aggregate — Where Business Rules Live

### What it is

A pure TypeScript class that owns all business rules for one domain concept. No database, no HTTP, no framework. Just logic and state.

```typescript
export class UserAggregate extends AggregateRoot {
  static async register(email: string, firstName: string, lastName: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);  // business rule: how passwords are stored
    const user = new UserAggregate({
      id: crypto.randomUUID(),  // business rule: the domain generates its own identity
      email,
      firstName,
      lastName,
      passwordHash,
      isEmailVerified: false,  // business rule: new users start unverified
      ...
    });
    user.apply(new UserRegisteredEvent(user.id, user.email));  // raises a domain event
    return user;
  }
}
```

### The problem it solves

Without an Aggregate, business rules scatter everywhere. Password hashing ends up in the handler. Email verification logic ends up in the controller. Initial user state is decided in three different places. When the rule changes, you hunt for every place it appears.

An Aggregate is the single source of truth for "what is valid" in your domain.

### The two factory methods — why both exist

```typescript
// For NEW entities — runs business rules
static async register(...): Promise<UserAggregate>

// For EXISTING entities loaded from DB — no rules, just restore state
static reconstitute(props: UserProps): UserAggregate
```

`reconstitute()` exists because when you load a user from the database, they are already valid — they were validated when first created. Running the rules again would be wrong (e.g. hashing the already-hashed password again).

### Real-world example

Think of a **loan application processor** at a bank — not the person, but the rulebook they follow:

- Loan amount cannot exceed 5x annual income. (business rule)
- Applicant must be 18 or older. (business rule)
- Risk tier is calculated from income and loan amount. (business rule)

That rulebook doesn't care if the application came in by email, in person, or through an app. It doesn't know how applications are stored in the database. It just enforces rules.

The Aggregate is that rulebook — pure logic, no infrastructure.

### What the Aggregate does NOT do

- It does not call the database.
- It does not send emails.
- It does not know it is running inside NestJS.
- It does not format HTTP responses.

This is intentional. Because it has no dependencies, you can test it with zero mocks:

```typescript
const user = await UserAggregate.register(
  'test@example.com',
  'John',
  'Doe',
  'password123',
);
expect(user.isEmailVerified).toBe(false);
expect(user.passwordHash).not.toBe('password123');
```

No database. No HTTP client. No test setup. Just a function call and an assertion.

---

## 5. The Repository Pattern

### What it is

An interface that hides how data is stored. The rest of your code talks to the interface and never knows if it's Postgres, MongoDB, or an in-memory array.

```typescript
// The interface — lives in the domain layer, no Prisma imports
export interface IUserRepository {
  findByEmail(email: string): Promise<UserAggregate | null>;
  save(user: UserAggregate): Promise<void>;
}

// The implementation — the only file that knows about Prisma
export class PrismaUserRepository implements IUserRepository {
  async findByEmail(email: string) { ... }
  async save(user: UserAggregate) { ... }
}
```

### The problem it solves

Without the repository pattern, your handler directly calls `prisma.user.findUnique(...)`. Now:

- The handler is tightly coupled to Prisma. Switching databases means rewriting every handler.
- Unit testing a handler requires mocking Prisma — a complex object with nested delegates.
- A new developer reading the handler sees SQL alongside business logic and can't tell them apart.

### Real-world example

Think of a **power outlet**:

- Your laptop charger plugs into an outlet. It doesn't know or care if the power comes from a coal plant, a solar farm, or a nuclear reactor.
- The outlet is the interface. The power source is the implementation.
- You can switch from coal to solar without changing your charger.

`IUserRepository` is the outlet. `PrismaUserRepository` is the power source. The handler just plugs in.

### How swapping implementations works

To switch from Postgres to MongoDB, you write one new class and change one line in the module:

```typescript
// Before
{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }

// After
{ provide: USER_REPOSITORY, useClass: MongoUserRepository }
```

Every handler is untouched.

For tests, you use an in-memory fake:

```typescript
const mockRepo: IUserRepository = {
  findByEmail: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
};
```

No database needed in tests.

---

## 6. Domain Events

### What they are

A fact that something happened in the domain, named in past tense. The Aggregate raises it after a state change. Independent handlers react to it.

```typescript
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
```

### The problem it solves

Without domain events, the handler does everything:

```typescript
// Bad — handler doing too much
async execute(command) {
  const user = await UserAggregate.register(...);
  await this.userRepo.save(user);
  await this.emailService.sendVerificationEmail(user.email);  // directly coupled
  await this.auditService.log(user.id);                       // directly coupled
  await this.analyticsService.track('user_registered');       // directly coupled
}
```

Now every new side effect requires modifying the handler. The handler needs to know about email, audit, and analytics services. Testing it requires mocking all three. If the analytics service goes down, registration fails.

With domain events:

```typescript
// Good — handler is thin
async execute(command) {
  const user = await UserAggregate.register(...);
  await this.userRepo.save(user);
  user.commit();  // fires UserRegisteredEvent — handler's job is done
}

// Side effects are independent handlers
@EventsHandler(UserRegisteredEvent)
class UserRegisteredHandler {
  handle(event) { /* send email */ }
}

@EventsHandler(UserRegisteredEvent)
class AuditUserRegisteredHandler {
  handle(event) { /* write audit log */ }
}
```

Adding a new side effect (e.g. notify Slack) means adding one new handler — the registration handler is never touched.

### Real-world example

Think of a **newspaper**:

- An event happens: "Government passes new law."
- The newspaper publishes that fact.
- Readers react independently: lawyers read it, businesses plan accordingly, citizens discuss it.
- The newspaper doesn't know who reads it or what they do with the information.

The Aggregate is the newspaper. The event is the headline. The event handlers are the readers.

### The order matters

Events are committed **after** the save:

```typescript
await this.userRepo.save(user); // user is in DB
user.commit(); // NOW events fire
```

This guarantees the user exists in the database before the verification email is sent. If the email fails, the user is still registered — side effects are decoupled from the main transaction.

---

## 7. DTOs vs Commands — Two Different Layers

### The distinction

|             | DTO                          | Command                   |
| ----------- | ---------------------------- | ------------------------- |
| Lives in    | HTTP layer                   | Domain layer              |
| Purpose     | Validate request shape       | Carry data to the handler |
| Decorators  | `@IsEmail()`, `@MinLength()` | None                      |
| Knows about | HTTP, class-validator        | Nothing                   |

### Why two objects instead of one

The DTO validates the HTTP request — is this a valid email format? Is the password long enough? These are HTTP concerns.

The Command carries clean, already-validated data to the domain. It has no idea it came from HTTP. The same Command could be created by a CLI tool, a scheduled job, or a message queue consumer.

### Real-world example

Think of a **customs form** at an airport (DTO) vs the **internal warehouse record** (Command):

- The customs form has specific fields, checkboxes, and validation rules for the border agent.
- Once approved, the warehouse creates their own internal record in their own format.
- The warehouse doesn't care about the customs form's layout — they just need the data.

---

## 8. How It All Fits Together

Here is the full flow for a single POST /api/v1/users/register request:

```
1. HTTP request arrives
      |
2. ValidationPipe runs on RegisterUserDto
   - Is email a valid format?
   - Is password at least 8 characters?
   - Rejects with 400 if invalid
      |
3. UsersController.register()
   - Creates RegisterUserCommand(email, firstName, lastName, password)
   - Fires it onto the CommandBus
   - Awaits the result
      |
4. CommandBus routes to RegisterUserHandler
      |
5. RegisterUserHandler.execute()
   - Calls userRepo.findByEmail() — checks if email already exists
   - Throws ConflictException (409) if it does
      |
6. UserAggregate.register()
   - Hashes the password
   - Generates a UUID as the user's identity
   - Sets isEmailVerified = false
   - Queues UserRegisteredEvent (not dispatched yet)
   - Returns the Aggregate instance
      |
7. userRepo.save(user)
   - PrismaUserRepository.save() is called
   - Runs prisma.user.upsert() — writes to PostgreSQL
      |
8. user.commit()
   - EventBus dispatches UserRegisteredEvent
      |
9. UserRegisteredHandler.handle()
   - Runs as a side effect
   - Currently logs; will send verification email in step 8
      |
10. Handler returns { id, email }
    Controller returns HTTP 201 with the response body
```

Each step has one job. Each layer knows only what it needs to know.

---

## Summary Table

| Pattern                   | Where in code                                | Single responsibility              |
| ------------------------- | -------------------------------------------- | ---------------------------------- |
| DTO + ValidationPipe      | `dto/register-user.dto.ts`                   | Validate HTTP request shape        |
| Command                   | `commands/register-user.command.ts`          | Carry clean data to the bus        |
| Command Handler           | `commands/handlers/register-user.handler.ts` | Orchestrate the use case           |
| Aggregate                 | `domain/user.aggregate.ts`                   | Own all business rules             |
| Repository interface      | `domain/user.repository.ts`                  | Define what persistence looks like |
| Repository implementation | `infrastructure/prisma-user.repository.ts`   | Talk to the actual database        |
| Domain Event              | `events/user-registered.event.ts`            | Record that something happened     |
| Event Handler             | `events/handlers/user-registered.handler.ts` | React to the event (side effects)  |
