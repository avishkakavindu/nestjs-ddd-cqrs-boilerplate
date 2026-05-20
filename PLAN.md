# NestJS CQRS + Light DDD Boilerplate — Build Plan

## Stack

- Framework: NestJS 11, TypeScript strict
- Database: PostgreSQL + Prisma
- Pattern: CQRS + Light DDD (Aggregates + Domain Events)
- Auth: JWT access/refresh + Google OAuth2 + email verification
- Validation: class-validator + class-transformer
- Logger: Pino (nestjs-pino)
- Email: Nodemailer + Handlebars
- i18n: nestjs-i18n
- Security: Helmet + CORS + Throttler
- Docs: Swagger
- Tooling: ESLint + Prettier + Husky + Conventional Commits + Docker

---

## Steps

### Infrastructure

| #   | Step                                                                | Status | Commit                                                                                          |
| --- | ------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| 1   | Scaffold NestJS project (`nest new`)                                | done   | `chore: initial project setup`                                                                  |
| 2   | Config module (`@nestjs/config` + class-validator env validation)   | done   | `chore: initial project setup`                                                                  |
| 3   | Logger module (Pino + nestjs-pino)                                  | done   | `chore: initial project setup`                                                                  |
| 4   | Husky + lint-staged + conventional commits                          | done   | `chore: fix commit-msg hook`                                                                    |
| 5   | Prisma setup (schema, PrismaService, PrismaModule, migrations)      | done   | `feat: add Prisma setup`                                                                        |
| 6   | Health check module (`@nestjs/terminus`)                            | done   | `feat: add health check`                                                                        |
| 7   | i18n module (`nestjs-i18n`)                                         | done   | `feat: add i18n module`                                                                         |
| 8   | Email module (Nodemailer + Handlebars)                              | done   | `feat: add email module with Nodemailer, Handlebars templates, and verification/welcome emails` |
| 9   | Common layer (filters, interceptors, pipes, decorators, pagination) | done   | `feat: add common layer`                                                                        |
| 10  | Security (Helmet, CORS, Throttler) + Swagger + main.ts bootstrap    | done   | `feat: add security and swagger`                                                                |
| 11  | Docker + docker-compose (app + PostgreSQL)                          | done   | `feat: add Docker setup`                                                                        |

### CQRS + DDD (Users domain)

| #   | Step                                                                      | Status | Commit                                                                             |
| --- | ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| 12  | Install `@nestjs/cqrs` — what CQRS is                                     | done   | `feat: add UsersModule with CqrsModule`                                            |
| 13  | First Command + Handler (RegisterUser, no Aggregate yet)                  | done   | `feat: add RegisterUser command and handler`                                       |
| 14  | User Aggregate (pure class, domain logic, `apply()` events)               | done   | `feat: add UserAggregate and move domain logic out of handler`                     |
| 15  | Repository pattern (`IUserRepository` interface + `PrismaUserRepository`) | done   | `feat: add IUserRepository interface and PrismaUserRepository`                     |
| 16  | Domain Events (`UserRegisteredEvent` -> send verification email)          | done   | `feat: add UserRegisteredEvent, raise from Aggregate, dispatch via EventPublisher` |
| 17  | Remaining User Commands (`VerifyEmailCommand`, `ChangePasswordCommand`)   | done   | `feat: add VerifyEmailCommand and ChangePasswordCommand`                           |
| 18  | Query side (`GetUserQuery`, `ListUsersQuery`)                             | done   | `feat: add GetUserQuery and ListUsersQuery with paginated response`                |

### Auth (CQRS-style)

| #   | Step                                                   | Status | Commit                                                                       |
| --- | ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| 19  | JWT strategy + guards (access + refresh tokens)        | done   | `feat: add JWT auth with global guard, login, logout, and refresh endpoints` |
| 20  | Login + Logout + Refresh as Commands on User Aggregate | done   | `feat: add JWT auth with global guard, login, logout, and refresh endpoints` |
| 21  | Google OAuth2 strategy                                 | done   | `feat: add Google OAuth2 strategy with find-or-create and account linking`   |

### Tests

| #   | Step                                            | Status | Commit                                                                             |
| --- | ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| 22  | Aggregate unit tests (pure functions, no mocks) | done   | `test: add UserAggregate unit tests covering all business rules and domain events` |
| 23  | Handler unit tests (mocked `IUserRepository`)   | done   | `test(TASK-23): add handler unit tests with mocked IUserRepository`                |

---

## CQRS + DDD Flow (reference)

```
Write side:
  HTTP Request
    -> Controller
    -> CommandBus.execute(command)
    -> CommandHandler
    -> IUserRepository.findById()  <- load Aggregate
    -> User Aggregate (domain logic runs here)
    -> User Aggregate.apply(event) <- raises Domain Event
    -> IUserRepository.save()      <- persist new state
    -> EventBus dispatches event
    -> EventHandler (send email, log, etc.)

Read side:
  HTTP Request
    -> Controller
    -> QueryBus.execute(query)
    -> QueryHandler
    -> PrismaService (direct DB read, no Aggregate, no repository)
    -> returns DTO
```

## Domain Events

| Event                      | Triggered by           | Handler side effect             |
| -------------------------- | ---------------------- | ------------------------------- |
| `UserRegisteredEvent`      | RegisterUser command   | Send verification email         |
| `UserEmailVerifiedEvent`   | VerifyEmail command    | Send welcome email              |
| `UserPasswordChangedEvent` | ChangePassword command | (no handler — extend as needed) |
