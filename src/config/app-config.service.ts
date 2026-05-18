import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Wraps ConfigService so every value has a proper TypeScript type.
// Inject AppConfigService instead of ConfigService throughout the app.
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  // App
  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV')!;
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get<number>('PORT')!;
  }

  // Database
  get databaseUrl(): string {
    return this.config.get<string>('DATABASE_URL')!;
  }

  // JWT
  get jwtAccessSecret(): string {
    return this.config.get<string>('JWT_ACCESS_SECRET')!;
  }

  get jwtAccessExpiry(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRY')!;
  }

  get jwtRefreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET')!;
  }

  get jwtRefreshExpiry(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRY')!;
  }

  // Google OAuth
  get googleClientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID')!;
  }

  get googleClientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET')!;
  }

  get googleCallbackUrl(): string {
    return this.config.get<string>('GOOGLE_CALLBACK_URL')!;
  }

  // Email
  get smtpHost(): string {
    return this.config.get<string>('SMTP_HOST')!;
  }

  get smtpPort(): number {
    return this.config.get<number>('SMTP_PORT')!;
  }

  get smtpUser(): string {
    return this.config.get<string>('SMTP_USER')!;
  }

  get smtpPass(): string {
    return this.config.get<string>('SMTP_PASS')!;
  }

  get emailFrom(): string {
    return this.config.get<string>('EMAIL_FROM')!;
  }

  get baseUrl(): string {
    return this.config.get<string>('BASE_URL')!;
  }

  get emailVerificationExpiryHours(): number {
    return this.config.get<number>('EMAIL_VERIFICATION_EXPIRY_HOURS')!;
  }

  // Security
  get corsOrigin(): string {
    return this.config.get<string>('CORS_ORIGIN')!;
  }

  get throttleTtl(): number {
    return this.config.get<number>('THROTTLE_TTL')!;
  }

  get throttleLimit(): number {
    return this.config.get<number>('THROTTLE_LIMIT')!;
  }
}
