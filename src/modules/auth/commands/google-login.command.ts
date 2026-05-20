export class GoogleLoginCommand {
  constructor(
    readonly googleId: string,
    readonly email: string,
    readonly firstName: string,
    readonly lastName: string,
  ) {}
}
