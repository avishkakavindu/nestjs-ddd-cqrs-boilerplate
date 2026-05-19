export class UserEmailVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}
