# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is a **learning-focused** NestJS boilerplate demonstrating CQRS + light DDD (Domain-Driven Design). It is built step by step so each concept is introduced incrementally. The domain example is **Users**.

## Commands

```bash
# Install dependencies
npm install

# Development
npm run start:dev

# Build
npm run build

# Tests
npm run test                  # all unit tests
npm run test:e2e              # end-to-end tests
npm run test -- --testPathPattern=users   # single module tests

# Lint & format
npm run lint
npm run format
```

## Architecture

### Pattern: CQRS + Light DDD

**Light DDD** means: Aggregates + Domain Events only. No bounded contexts, no repositories-as-interfaces over ORMs, no value objects unless they add clarity.

**CQRS** means: Commands mutate state through Aggregates. Queries read state directly — no domain logic on the read side.

### Request flow

**Write side (Command):**

```
Controller → CommandBus.execute(command) → CommandHandler → Aggregate → DomainEvent → EventHandler
```

**Read side (Query):**

```
Controller → QueryBus.execute(query) → QueryHandler → Database (direct, no Aggregate)
```

### Module structure (per domain feature)

```
src/<feature>/
  commands/
    <action>.command.ts           # plain data object, no logic
    handlers/
      <action>.handler.ts         # @CommandHandler — orchestrates Aggregate + persistence
  queries/
    <action>.query.ts             # plain data object
    handlers/
      <action>.handler.ts         # @QueryHandler — thin DB read, returns DTO
  events/
    <name>.event.ts               # plain data object emitted by Aggregate
    handlers/
      <name>.handler.ts           # @EventsHandler — side effects (emails, logs, projections)
  domain/
    <feature>.aggregate.ts        # Aggregate root — all business rules live here
  <feature>.controller.ts
  <feature>.module.ts
```

### Key rules

- **Aggregates own business logic.** Controllers and handlers contain no if/else business rules.
- **Queries are thin.** QueryHandlers call the DB/ORM directly and return a DTO — they never instantiate an Aggregate.
- **Domain Events are facts.** Named in past tense (`UserCreatedEvent`). The Aggregate raises them; the EventBus dispatches them after the transaction.
- **CommandHandlers persist.** The handler (not the Aggregate) is responsible for saving state via TypeORM/Prisma. The Aggregate does not know about the DB.

### NestJS CQRS wiring

`CqrsModule` is imported in the feature module. The module's `providers` array must register all handlers explicitly:

```ts
providers: [
  CreateUserHandler, // CommandHandler
  GetUserHandler, // QueryHandler
  UserCreatedHandler, // EventsHandler
];
```

`CommandBus`, `QueryBus`, and `EventBus` are injectable anywhere via constructor injection after importing `CqrsModule`.
