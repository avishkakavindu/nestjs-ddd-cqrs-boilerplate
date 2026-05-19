# NestJS CQRS + Light DDD Boilerplate

A learning-focused NestJS boilerplate that demonstrates **CQRS** and **Light Domain-Driven Design (DDD)** patterns step by step. The domain example used throughout is **Users**.

---

## What is this?

Most NestJS tutorials put everything in a service class — business rules, database calls, validation — all mixed together. This boilerplate shows a cleaner way to organise a backend:

- **CQRS** separates _writes_ (commands) from _reads_ (queries)
- **Light DDD** puts business rules inside an Aggregate class, not in services
- Each concern lives in its own file with a clear, single responsibility

This is not an enterprise-level framework. It is a reference project designed so you can read the code and understand why each piece exists.

---

## Stack

| Tool                      | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| NestJS 11                 | Framework, dependency injection, modules    |
| TypeScript (strict)       | Type safety                                 |
| PostgreSQL                | Database                                    |
| Prisma 7                  | ORM and migrations                          |
| `@nestjs/cqrs`            | CommandBus, QueryBus, EventBus              |
| Pino (`nestjs-pino`)      | Structured JSON logging                     |
| `@nestjs/config`          | Environment variable loading and validation |
| class-validator           | DTO validation                              |
| JWT                       | Access and refresh token auth               |
| Google OAuth2             | Social login                                |
| Nodemailer + Handlebars   | Email sending                               |
| Helmet + CORS + Throttler | Security                                    |
| Swagger                   | API documentation                           |
| Husky + commitlint        | Git hooks and conventional commits          |

---

## Commands

```bash
# Install dependencies
npm install

# Run in development (watch mode)
npm run start:dev

# Build
npm run build

# Run all unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint
npm run lint

# Format
npm run format

# Prisma: create and apply a migration
npm run prisma:migrate

# Prisma: open Prisma Studio (GUI for your database)
npm run prisma:studio

# Prisma: regenerate the client after schema changes
npm run prisma:generate
```

---

## Architecture

### Two core ideas

#### 1. CQRS — Command Query Responsibility Segregation

Split every operation into one of two types:

| Type        | What it does                           | Touches Aggregate? |
| ----------- | -------------------------------------- | ------------------ |
| **Command** | Changes state (create, update, delete) | Yes                |
| **Query**   | Reads state (get, list)                | No                 |

Why? Because the code that _changes_ data needs business rules and validation. The code that _reads_ data just needs to be fast. Keeping them separate means neither gets cluttered with the other's concerns.

#### 2. Light DDD — Domain-Driven Design (Aggregates + Domain Events only)

"Light" means we skip the heavy DDD machinery (bounded contexts, value objects, repository interfaces over ORMs). We keep only the two most useful ideas:

- **Aggregate** — A class that owns the business rules for one entity (e.g. `User`). All if/else business logic lives here.
- **Domain Events** — Facts that something happened (e.g. `UserRegisteredEvent`). The Aggregate raises them; handlers react to them (send email, write audit log, etc.).

---

## Request Flow

### Write side (Command)

```
HTTP POST /users/register
  -> UsersController
  -> CommandBus.execute(new RegisterUserCommand(dto))
  -> RegisterUserHandler
      -> UserAggregate.register(email, password)   <- business rules here
      -> prisma.user.create(...)                   <- handler persists
      -> EventBus.publish(new UserRegisteredEvent) <- raised by Aggregate
  -> UserRegisteredHandler
      -> EmailService.sendVerification(email)      <- side effect
```

### Read side (Query)

```
HTTP GET /users/:id
  -> UsersController
  -> QueryBus.execute(new GetUserQuery(id))
  -> GetUserHandler
      -> prisma.user.findUnique(...)               <- direct DB read, no Aggregate
      -> return UserDto
```

---

## Folder Structure

```
nestjs-cqrs-boilerplate/
|
|- prisma/
|   |- schema.prisma          <- Database schema (models, relations)
|   |- migrations/            <- Auto-generated migration files
|
|- prisma.config.ts           <- Prisma CLI configuration (datasource URL)
|
|- src/
|   |
|   |   // --- Infrastructure (cross-cutting, no business logic) ---
|   |
|   |- config/                <- Environment variable loading & validation
|   |   |- config.module.ts
|   |   |- app-config.service.ts
|   |   |- env.validation.ts
|   |
|   |- logger/                <- Pino structured logger setup
|   |   |- logger.module.ts
|   |
|   |- prisma/                <- Database client (PrismaService)
|   |   |- prisma.module.ts
|   |   |- prisma.service.ts
|   |
|   |- health/                <- Health check endpoint (/health)
|   |   |- health.controller.ts
|   |   |- health.module.ts
|   |
|   |- i18n/                  <- Translations
|   |   |- en/
|   |   |   |- common.json
|   |   |   |- auth.json
|   |   |   |- users.json
|   |   |- i18n.module.ts
|   |
|   |- common/                <- Shared utilities used across all modules
|   |   |- filters/
|   |   |   |- all-exceptions.filter.ts
|   |   |- decorators/
|   |   |   |- current-user.decorator.ts
|   |   |- dto/
|   |   |   |- pagination.dto.ts
|   |   |- common.module.ts
|   |
|   |   // --- Domain modules (business logic lives here) ---
|   |
|   |- modules/
|   |   |
|   |   |- users/             <- Users domain
|   |   |   |- commands/
|   |   |   |   |- register-user.command.ts
|   |   |   |   |- handlers/
|   |   |   |       |- register-user.handler.ts
|   |   |   |
|   |   |   |- queries/
|   |   |   |   |- get-user.query.ts
|   |   |   |   |- handlers/
|   |   |   |       |- get-user.handler.ts
|   |   |   |
|   |   |   |- events/
|   |   |   |   |- user-registered.event.ts
|   |   |   |   |- handlers/
|   |   |   |       |- user-registered.handler.ts
|   |   |   |
|   |   |   |- domain/
|   |   |   |   |- user.aggregate.ts
|   |   |   |
|   |   |   |- users.controller.ts
|   |   |   |- users.module.ts
|   |   |
|   |   |- posts/             <- Posts domain (same pattern, different domain)
|   |   |   |- commands/
|   |   |   |   |- create-post.command.ts
|   |   |   |   |- publish-post.command.ts
|   |   |   |   |- handlers/
|   |   |   |       |- create-post.handler.ts
|   |   |   |       |- publish-post.handler.ts
|   |   |   |
|   |   |   |- queries/
|   |   |   |   |- get-post.query.ts
|   |   |   |   |- list-posts.query.ts
|   |   |   |   |- handlers/
|   |   |   |       |- get-post.handler.ts
|   |   |   |       |- list-posts.handler.ts
|   |   |   |
|   |   |   |- events/
|   |   |   |   |- post-published.event.ts
|   |   |   |   |- handlers/
|   |   |   |       |- post-published.handler.ts
|   |   |   |
|   |   |   |- domain/
|   |   |   |   |- post.aggregate.ts
|   |   |   |
|   |   |   |- posts.controller.ts
|   |   |   |- posts.module.ts
|   |
|   |- app.module.ts          <- Root module, imports all feature modules
|   |- main.ts                <- Entry point, bootstrap
|
|- .env                       <- Your local environment variables (not committed)
|- .env.example               <- Template showing which variables are needed
|- PLAN.md                    <- Step-by-step build plan with status tracking
```

---

## What Each Folder Does

### `prisma/`

Holds everything the Prisma CLI needs.

- **`schema.prisma`** — defines your database tables as Prisma models:

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String?
  isEmailVerified Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- **`migrations/`** — Prisma generates one folder per migration with the raw SQL. Never edit these by hand.

### `prisma.config.ts`

Config file for the Prisma CLI (not for the running app). Tells Prisma where to find the database when running `prisma migrate` or `prisma generate`:

```ts
export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'), // reads from .env
  },
});
```

### `src/config/`

Loads and validates all environment variables at startup. The app refuses to boot if any required variable is missing or has the wrong type.

- **`env.validation.ts`** — declares every expected env variable with its type and whether it's required:

```ts
class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string; // required — app won't start without it

  @IsNumber()
  @IsOptional()
  PORT: number = 3000; // optional — defaults to 3000
}
```

- **`app-config.service.ts`** — a typed wrapper so you inject `AppConfigService` instead of raw `ConfigService`. Every value has a proper TypeScript type:

```ts
// Instead of this (string, easy to typo the key):
this.configService.get<string>('DATABASE_URL');

// You do this (typed property, autocomplete works):
this.appConfigService.databaseUrl;
```

- **`config.module.ts`** — marked `@Global()` so it only needs to be imported once in `AppModule`. All other modules get `AppConfigService` automatically.

### `src/logger/`

Sets up Pino as the app-wide logger. Pino writes structured JSON logs (better for production log aggregators like Datadog or CloudWatch) and is much faster than NestJS's default logger.

### `src/prisma/`

Wraps `PrismaClient` in a NestJS service so it participates in the dependency injection system.

- **`prisma.service.ts`** — extends `PrismaClient` and connects/disconnects with the module lifecycle:

```ts
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: AppConfigService) {
    const adapter = new PrismaPg({ connectionString: config.databaseUrl });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- **`prisma.module.ts`** — marked `@Global()`, so any module in the app can inject `PrismaService` without re-importing `PrismaModule`.

### `src/modules/users/` (added in later steps)

This is where the CQRS + DDD pattern comes to life. Here is what each sub-folder holds:

#### `commands/`

A command is a plain object that describes _what you want to do_. No logic — just data:

```ts
// register-user.command.ts
export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
```

#### `commands/handlers/`

The handler receives the command, orchestrates the Aggregate, persists the result, and publishes events:

```ts
@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RegisterUserCommand) {
    const user = UserAggregate.register(command.email, command.password);
    await this.prisma.user.create({ data: { ...user } });
    this.eventBus.publish(new UserRegisteredEvent(user.id, user.email));
  }
}
```

#### `queries/` and `queries/handlers/`

A query is also a plain object — just the parameters for the read:

```ts
// get-user.query.ts
export class GetUserQuery {
  constructor(public readonly id: string) {}
}
```

The handler goes straight to the database — no Aggregate involved:

```ts
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserQuery) {
    return this.prisma.user.findUnique({ where: { id: query.id } });
  }
}
```

#### `events/`

An event is a fact in past tense — it describes something that already happened:

```ts
// user-registered.event.ts
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
```

#### `events/handlers/`

Handles side effects after an event fires. The command handler doesn't care about these — it just publishes the event and moves on:

```ts
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  async handle(event: UserRegisteredEvent) {
    // send verification email, write audit log, etc.
  }
}
```

#### `domain/`

The Aggregate is the most important class in the domain. It contains all the business rules:

```ts
// user.aggregate.ts
export class UserAggregate {
  id: string;
  email: string;
  passwordHash: string;
  isEmailVerified = false;

  static register(email: string, password: string): UserAggregate {
    // business rule: email must be valid
    // business rule: password must meet requirements
    // no database calls here — pure logic only
    const user = new UserAggregate();
    user.id = cuid();
    user.email = email;
    user.passwordHash = hashPassword(password);
    return user;
  }
}
```

Key rule: **the Aggregate never imports Prisma**. It only knows about the domain — not about how data is stored.

---

### `src/modules/posts/` (second domain — same pattern, different context)

Posts follow the exact same structure as Users. This is the point: once you learn the pattern for one domain, adding a new one is mechanical.

#### `commands/`

Two commands — one to create a draft, one to publish it:

```ts
// create-post.command.ts
export class CreatePostCommand {
  constructor(
    public readonly authorId: string,
    public readonly title: string,
    public readonly body: string,
  ) {}
}

// publish-post.command.ts
export class PublishPostCommand {
  constructor(public readonly postId: string) {}
}
```

#### `commands/handlers/`

Each command gets its own handler. `PublishPostHandler` loads the existing post, runs the domain logic, and persists the change:

```ts
@CommandHandler(PublishPostCommand)
export class PublishPostHandler implements ICommandHandler<PublishPostCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: PublishPostCommand) {
    const row = await this.prisma.post.findUniqueOrThrow({
      where: { id: command.postId },
    });
    const post = PostAggregate.fromPersistence(row);

    post.publish(); // business rule lives here, not here in the handler

    await this.prisma.post.update({
      where: { id: post.id },
      data: { publishedAt: post.publishedAt },
    });

    this.eventBus.publish(new PostPublishedEvent(post.id, post.authorId));
  }
}
```

#### `queries/` and `queries/handlers/`

Queries skip the Aggregate entirely. `ListPostsQuery` reads directly from the database:

```ts
// list-posts.query.ts
export class ListPostsQuery {
  constructor(
    public readonly page: number,
    public readonly limit: number,
  ) {}
}

// list-posts.handler.ts
@QueryHandler(ListPostsQuery)
export class ListPostsHandler implements IQueryHandler<ListPostsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListPostsQuery) {
    return this.prisma.post.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }
}
```

#### `events/` and `events/handlers/`

The `PostPublishedEvent` is raised by the handler after publishing. Any number of handlers can react to it independently:

```ts
// post-published.event.ts
export class PostPublishedEvent {
  constructor(
    public readonly postId: string,
    public readonly authorId: string,
  ) {}
}

// post-published.handler.ts
@EventsHandler(PostPublishedEvent)
export class PostPublishedHandler implements IEventHandler<PostPublishedEvent> {
  async handle(event: PostPublishedEvent) {
    // notify followers, update author stats, index for search, etc.
  }
}
```

#### `domain/`

The `PostAggregate` holds all post business rules. Notice `publish()` enforces the rule that a post must have a body before it can be published — and the handler never checks this itself:

```ts
// post.aggregate.ts
export class PostAggregate {
  id: string;
  authorId: string;
  title: string;
  body: string;
  publishedAt: Date | null = null;

  static fromPersistence(row: {
    id: string;
    authorId: string;
    title: string;
    body: string;
    publishedAt: Date | null;
  }): PostAggregate {
    const post = new PostAggregate();
    Object.assign(post, row);
    return post;
  }

  publish(): void {
    if (!this.body) throw new Error('Cannot publish a post with no body');
    if (this.publishedAt) throw new Error('Post is already published');
    this.publishedAt = new Date();
  }
}
```

#### Comparison: Users vs Posts

|                     | Users                               | Posts                                     |
| ------------------- | ----------------------------------- | ----------------------------------------- |
| Command             | `RegisterUserCommand`               | `CreatePostCommand`, `PublishPostCommand` |
| Query               | `GetUserQuery`                      | `GetPostQuery`, `ListPostsQuery`          |
| Event               | `UserRegisteredEvent`               | `PostPublishedEvent`                      |
| Aggregate rule      | password strength, email uniqueness | must have body before publishing          |
| Handler side effect | send verification email             | notify followers                          |

The structure is identical. Only the domain logic changes.

---

## Key Rules (Quick Reference)

| Rule                                            | Why                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Business logic belongs in the Aggregate         | Keeps handlers thin and logic testable without a database                            |
| Handlers do the persistence                     | Aggregates stay pure — no DB dependency                                              |
| Queries never use the Aggregate                 | Read paths are simpler and faster without domain logic                               |
| Domain events are past tense                    | They describe facts, not intentions (`UserRegisteredEvent`, not `RegisterUserEvent`) |
| `AppConfigService` instead of raw `process.env` | Validated at startup, typed, injectable                                              |
| `PrismaModule` is global                        | One import in `AppModule`; available everywhere                                      |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables (app will not start without these):

| Variable               | Description                       |
| ---------------------- | --------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string      |
| `JWT_ACCESS_SECRET`    | Secret for signing access tokens  |
| `JWT_REFRESH_SECRET`   | Secret for signing refresh tokens |
| `GOOGLE_CLIENT_ID`     | Google OAuth app client ID        |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app client secret    |
| `GOOGLE_CALLBACK_URL`  | OAuth redirect URL                |
| `SMTP_HOST`            | Email server hostname             |
