export class RefreshTokenCommand {
  constructor(
    readonly userId: string,
    readonly rawRefreshToken: string,
  ) {}
}
