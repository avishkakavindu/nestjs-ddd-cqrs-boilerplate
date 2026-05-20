import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfigService } from '../../../config/app-config.service';
import type { JwtPayload } from '../jwt-payload.interface';

// Registered under 'jwt-refresh' — matched by JwtRefreshGuard.
// passReqToCallback: true lets validate() receive the raw Request so we can
// extract the token string itself. We need the raw token in the Refresh command
// (Step 20) to compare it against the stored hash and detect token reuse.
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: JwtPayload,
  ): JwtPayload & { refreshToken: string } {
    const refreshToken = req
      .get('Authorization')!
      .replace('Bearer ', '')
      .trim();
    return { ...payload, refreshToken };
  }
}
