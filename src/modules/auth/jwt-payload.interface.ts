export interface JwtPayload {
  sub: string;
  email: string;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string;
}
