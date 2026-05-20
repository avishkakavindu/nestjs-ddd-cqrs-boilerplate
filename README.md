# NestJS CQRS + Light DDD Boilerplate

A learning-focused NestJS boilerplate demonstrating **CQRS** and **Light Domain-Driven Design** patterns, built step by step. The domain example used throughout is **Users** with full authentication.

---

## What is this?

Most NestJS tutorials put everything in a service class — business rules, database calls, validation — all mixed together. This boilerplate shows a cleaner way to organise a backend:

- **CQRS** separates _writes_ (commands) from _reads_ (queries)
- **Light DDD** puts business rules inside an Aggregate class, not in services
- **Domain Events** decouple side effects (emails, logs) from the commands that trigger them

This is not an enterprise-level framework. It is a reference project designed so you can read the code and understand why each piece exists.

---

## Stack

| Tool                      | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| NestJS 11                 | Framework, dependency injection, modules    |
| TypeScript (strict)       | Type safety                                 |
| PostgreSQL + Prisma 7     | Database and migrations                     |
| `@nestjs/cqrs`            | CommandBus, QueryBus, EventBus              |
| Passport.js + JWT         | Access and refresh token auth               |
| Google OAuth2             | Social login via passport-google-oauth20    |
| Nodemailer + Handlebars   | Transactional email with templates          |
| nestjs-i18n               | Translated email subjects                   |
| Pino (`nestjs-pino`)      | Structured JSON logging                     |
| `@nestjs/config`          | Environment variable loading and validation |
| class-validator           | DTO validation                              |
| Helmet + CORS + Throttler | Security hardening                          |
| Swagger                   | API documentation at `/api`                 |
| Husky + commitlint        | Git hooks and conventional commits          |
| Docker + docker-compose   | App container + PostgreSQL + pgAdmin        |

---

## Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Build
npm run build

# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Lint and format
npm run lint
npm run format

# Prisma
npm run prisma:migrate    # create and apply a migration
npm run prisma:generate   # regenerate the client after schema changes
npm run prisma:studio     # open Prisma Studio (database GUI)
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

The code that _changes_ data needs business rules and validation. The code that _reads_ data just needs to be fast. Keeping them separate means neither gets cluttered with the other's concerns.

#### 2. Light DDD — Aggregates + Domain Events only

"Light" means we skip the heavy DDD machinery (bounded contexts, value objects, sagas). We keep only the two most useful ideas:

- **Aggregate** — A class that owns the business rules for one entity (`UserAggregate`). All if/else business logic lives here. The Aggregate never imports Prisma.
- **Domain Events** — Facts named in past tense (`UserRegisteredEvent`). The Aggregate raises them; separate handlers react (send email, write audit log).

---

## Request Flow

### Write side (Command)

```
HTTP POST /v1/users/register
  -> UsersController
  -> CommandBus.execute(new RegisterUserCommand(...))
  -> RegisterUserHandler
      -> IUserRepository.findByEmail()      <- check for duplicates
      -> UserAggregate.register(...)        <- business rules, password hashing
      -> IUserRepository.save()             <- handler persists via Prisma
      -> EventPublisher.mergeObjectContext()
      -> aggregate.commit()                 <- dispatches domain events
  -> UserRegisteredHandler
      -> EmailService.sendVerificationEmail()
```

### Read side (Query)

```
HTTP GET /v1/users/:id
  -> UsersController
  -> QueryBus.execute(new GetUserQuery(id))
  -> GetUserHandler
      -> PrismaService.user.findUnique()    <- direct DB read, no Aggregate
      -> return UserDto
```

---

## Authentication Flow

All endpoints are protected by a global `JwtAuthGuard`. Public endpoints (login, register, etc.) are marked with `@Public()`.

### Login

```
POST /v1/auth/login
  -> LoginHandler
      -> IUserRepository.findByEmail()
      -> user.validatePassword()            <- bcrypt compare, checks verified
      -> JwtService.sign()                  <- access token (15 min)
      -> JwtService.sign()                  <- refresh token (7 days, own secret)
      -> user.setRefreshToken()             <- bcrypt hash stored in DB
      -> return { accessToken, refreshToken }
```

### Refresh

```
POST /v1/auth/refresh  (Bearer <refreshToken>)
  -> JwtRefreshGuard validates token signature
  -> RefreshTokenHandler
      -> bcrypt.compare(raw, stored hash)
      -> JwtService.sign()                  <- new access token
      -> return { accessToken }
```

### Google OAuth

```
GET /v1/auth/google          -> redirects to Google consent screen
GET /v1/auth/google/callback -> GoogleLoginHandler
    -> findByGoogleId()      <- existing social user
    -> findByEmail()         <- email match -> link Google account
    -> registerViaGoogle()   <- new user, no password hash
    -> return { accessToken, refreshToken }
```

---

## Folder Structure

```
nestjs-cqrs-boilerplate/
|
|- prisma/
|   |- schema.prisma              <- Database schema
|   |- migrations/                <- Generated SQL migrations
|
|- src/
|   |
|   |   // Infrastructure (cross-cutting, no business logic)
|   |
|   |- config/                    <- Env variable loading and validation
|   |- logger/                    <- Pino structured logger
|   |- prisma/                    <- PrismaService (global)
|   |- health/                    <- /health endpoint
|   |- i18n/                      <- Translation JSON files
|   |- common/                    <- Shared filters, decorators, DTOs
|   |
|   |   // Domain modules
|   |
|   |- modules/
|   |   |
|   |   |- users/
|   |   |   |- commands/
|   |   |   |   |- register-user.command.ts
|   |   |   |   |- verify-email.command.ts
|   |   |   |   |- change-password.command.ts
|   |   |   |   |- handlers/
|   |   |   |       |- register-user.handler.ts
|   |   |   |       |- register-user.handler.spec.ts
|   |   |   |       |- verify-email.handler.ts
|   |   |   |       |- verify-email.handler.spec.ts
|   |   |   |       |- change-password.handler.ts
|   |   |   |       |- change-password.handler.spec.ts
|   |   |   |
|   |   |   |- queries/
|   |   |   |   |- get-user.query.ts
|   |   |   |   |- list-users.query.ts
|   |   |   |   |- handlers/
|   |   |   |       |- get-user.handler.ts
|   |   |   |       |- list-users.handler.ts
|   |   |   |
|   |   |   |- events/
|   |   |   |   |- user-registered.event.ts
|   |   |   |   |- user-email-verified.event.ts
|   |   |   |   |- user-password-changed.event.ts
|   |   |   |   |- handlers/
|   |   |   |       |- user-registered.handler.ts     <- sends verification email
|   |   |   |       |- user-email-verified.handler.ts <- sends welcome email
|   |   |   |
|   |   |   |- domain/
|   |   |   |   |- user.aggregate.ts
|   |   |   |   |- user.aggregate.spec.ts
|   |   |   |   |- user.repository.ts                <- IUserRepository interface
|   |   |   |
|   |   |   |- infrastructure/
|   |   |   |   |- prisma-user.repository.ts         <- Prisma implementation
|   |   |   |
|   |   |   |- users.controller.ts
|   |   |   |- users.module.ts
|   |   |
|   |   |- auth/
|   |   |   |- commands/
|   |   |   |   |- login.command.ts
|   |   |   |   |- logout.command.ts
|   |   |   |   |- refresh-token.command.ts
|   |   |   |   |- google-login.command.ts
|   |   |   |   |- handlers/
|   |   |   |       |- login.handler.ts
|   |   |   |       |- login.handler.spec.ts
|   |   |   |       |- logout.handler.ts
|   |   |   |       |- logout.handler.spec.ts
|   |   |   |       |- refresh-token.handler.ts
|   |   |   |       |- refresh-token.handler.spec.ts
|   |   |   |       |- google-login.handler.ts
|   |   |   |
|   |   |   |- strategies/
|   |   |   |   |- access-token.strategy.ts          <- 'jwt' strategy
|   |   |   |   |- refresh-token.strategy.ts         <- 'jwt-refresh' strategy
|   |   |   |   |- google.strategy.ts                <- 'google' strategy
|   |   |   |
|   |   |   |- guards/
|   |   |   |   |- jwt-auth.guard.ts                 <- global guard with @Public() escape
|   |   |   |   |- jwt-refresh.guard.ts
|   |   |   |   |- google-auth.guard.ts
|   |   |   |
|   |   |   |- auth.controller.ts
|   |   |   |- auth.module.ts
|   |   |
|   |   |- email/
|   |   |   |- email.service.ts                      <- business email layer
|   |   |   |- email.module.ts
|   |   |   |- templates/
|   |   |       |- verify-email.hbs
|   |   |       |- welcome-email.hbs
|   |   |
|   |   |- app-mailer/
|   |       |- app-mailer.module.ts                  <- SMTP infrastructure (MailerModule)
|   |
|   |- app.module.ts
|   |- main.ts
|
|- .env.example                   <- Template showing required variables
|- PLAN.md                        <- Step-by-step build plan with status
|- docs/
    |- PATTERNS.md                <- Deeper explanation of CQRS and DDD patterns
```

---

## Key Rules (Quick Reference)

| Rule                                         | Why                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| Business logic belongs in the Aggregate      | Keeps handlers thin and logic testable without a database                      |
| Handlers do the persistence                  | Aggregates stay pure — no DB dependency                                        |
| Queries never use the Aggregate              | Read paths are simpler and faster without domain logic                         |
| Domain events are named in past tense        | They are facts, not intentions (`UserRegisteredEvent` not `RegisterUserEvent`) |
| Event handlers own all side effects          | Commands don't know about emails or logs — they just commit events             |
| `@Public()` marks open endpoints             | The global `JwtAuthGuard` protects everything else automatically               |
| `import type` for decorated injection tokens | Required by TypeScript `isolatedModules` + `emitDecoratorMetadata`             |

---

## UserAggregate — Business Rules at a Glance

The `UserAggregate` is the heart of the Users domain. All state-changing methods return a **new instance** (immutable) and raise domain events:

| Method                              | What it enforces                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `UserAggregate.register()`          | Hashes password, generates email verification token (24h expiry), raises `UserRegisteredEvent` |
| `UserAggregate.registerViaGoogle()` | No password, email pre-verified, no domain event                                               |
| `verifyEmail(token)`                | Checks token match and expiry, raises `UserEmailVerifiedEvent`                                 |
| `validatePassword(plain)`           | Requires verified email, bcrypt compare                                                        |
| `changePassword(old, new)`          | Validates old password first, raises `UserPasswordChangedEvent`                                |
| `setRefreshToken(raw)`              | Hashes before storing — raw token never persisted                                              |
| `clearRefreshToken()`               | Sets hash to null (logout)                                                                     |
| `linkGoogleAccount(googleId)`       | Returns new instance with googleId set                                                         |

---

## Email Architecture

Two-layer design — infrastructure is separated from business intent:

```
AppMailerModule    <- SMTP config, MailerModule.forRootAsync, HandlebarsAdapter
      |
EmailModule        <- EmailService: sendVerificationEmail(), sendWelcomeEmail()
      |
Event handlers     <- UserRegisteredHandler, UserEmailVerifiedHandler
```

Callers pass domain data (email, firstName, verificationUrl). They never touch SMTP settings or template names directly.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable               | Required | Description                          |
| ---------------------- | -------- | ------------------------------------ |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string         |
| `PORT`                 | No       | HTTP port (default: 3000)            |
| `BASE_URL`             | Yes      | App base URL (used in email links)   |
| `JWT_ACCESS_SECRET`    | Yes      | Secret for signing access tokens     |
| `JWT_ACCESS_EXPIRY`    | No       | Access token lifetime (default: 15m) |
| `JWT_REFRESH_SECRET`   | Yes      | Secret for signing refresh tokens    |
| `JWT_REFRESH_EXPIRY`   | No       | Refresh token lifetime (default: 7d) |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth app client ID           |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth app client secret       |
| `GOOGLE_CALLBACK_URL`  | Yes      | OAuth redirect URL                   |
| `SMTP_HOST`            | Yes      | Email server hostname                |
| `SMTP_PORT`            | Yes      | Email server port                    |
| `SMTP_USER`            | Yes      | SMTP username                        |
| `SMTP_PASS`            | Yes      | SMTP password                        |
| `SMTP_FROM`            | Yes      | Sender address (e.g. `no-reply@...`) |

---

## Running with Docker

```bash
# Start PostgreSQL + pgAdmin (no app container needed for dev)
docker-compose up -d

# Apply migrations
npm run prisma:migrate

# Start the app in watch mode
npm run start:dev
```

pgAdmin is available at `http://localhost:5050`.

---

## Further Reading

See `docs/PATTERNS.md` for a deeper explanation of CQRS, the repository pattern, domain events, and why the Aggregate doesn't save itself.
