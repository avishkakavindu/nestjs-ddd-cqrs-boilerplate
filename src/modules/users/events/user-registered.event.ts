// Domain event: a fact that something happened in the domain, named in past tense.
// Plain data object - no logic. The Aggregate raises it; the EventBus delivers it to handlers.
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly emailVerificationToken: string,
  ) {}
}
