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

| #   | Step                                                                | Status  | Commit                           |
| --- | ------------------------------------------------------------------- | ------- | -------------------------------- |
| 1   | Scaffold NestJS project (`nest new`)                                | done    | `chore: initial project setup`   |
| 2   | Config module (`@nestjs/config` + class-validator env validation)   | done    | `chore: initial project setup`   |
| 3   | Logger module (Pino + nestjs-pino)                                  | done    | `chore: initial project setup`   |
| 4   | Husky + lint-staged + conventional commits                          | done    | `chore: fix commit-msg hook`     |
| 5   | Prisma setup (schema, PrismaService, PrismaModule, migrations)      | done    | `feat: add Prisma setup`         |
| 6   | Health check module (`@nestjs/terminus`)                            | done    | `feat: add health check`         |
| 7   | i18n module (`nestjs-i18n`)                                         | done    | `feat: add i18n module`          |
| 8   | Email module (Nodemailer + Handlebars)                              | pending | -                                |
| 9   | Common layer (filters, interceptors, pipes, decorators, pagination) | done    | `feat: add common layer`         |
| 10  | Security (Helmet, CORS, Throttler) + Swagger + main.ts bootstrap    | done    | `feat: add security and swagger` |
| 11  | Docker + docker-compose (app + PostgreSQL)                          | done    | `feat: add Docker setup`         |

### CQRS + DDD (Users domain)

| #   | Step                                                                      | Status  | Commit                                       |
| --- | ------------------------------------------------------------------------- | ------- | -------------------------------------------- |
| 12  | Install `@nestjs/cqrs` — what CQRS is                                     | done    | `feat: add UsersModule with CqrsModule`      |
| 13  | First Command + Handler (RegisterUser, no Aggregate yet)                  | done    | `feat: add RegisterUser command and handler` |
| 14  | User Aggregate (pure class, domain logic, `apply()` events)               | pending | -                                            |
| 15  | Repository pattern (`IUserRepository` interface + `PrismaUserRepository`) | pending | -                                            |
| 16  | Domain Events (`UserRegisteredEvent` -> send verification email)          | pending | -                                            |
| 17  | Remaining User Commands (`VerifyEmailCommand`, `ChangePasswordCommand`)   | pending | -                                            |
| 18  | Query side (`GetUserQuery`, `ListUsersQuery`)                             | pending | -                                            |

### Auth (CQRS-style)

| #   | Step                                                   | Status  | Commit |
| --- | ------------------------------------------------------ | ------- | ------ |
| 19  | JWT strategy + guards (access + refresh tokens)        | pending | -      |
| 20  | Login + Logout + Refresh as Commands on User Aggregate | pending | -      |
| 21  | Google OAuth2 strategy                                 | pending | -      |

### Tests

| #   | Step                                            | Status  | Commit |
| --- | ----------------------------------------------- | ------- | ------ |
| 22  | Aggregate unit tests (pure functions, no mocks) | pending | -      |
| 23  | Handler unit tests (mocked `IUserRepository`)   | pending | -      |

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
    -> IUserRepository.findMany()  <- direct DB read, no Aggregate
    -> returns DTO
```

## Domain Events

| Event                      | Triggered by           | Handler side effect       |
| -------------------------- | ---------------------- | ------------------------- |
| `UserRegisteredEvent`      | RegisterUser command   | Send verification email   |
| `UserEmailVerifiedEvent`   | VerifyEmail command    | Send welcome email        |
| `UserLoggedInEvent`        | Login command          | Write audit log           |
| `UserPasswordChangedEvent` | ChangePassword command | Send security alert email |
