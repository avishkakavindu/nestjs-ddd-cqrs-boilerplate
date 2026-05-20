import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

// Each property = one environment variable.
// Decorators describe what is required and what type it must be.
// class-transformer will coerce strings from process.env into the right types
// (e.g. "3000" -> 3000 for numbers).
class EnvironmentVariables {
  // App
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  // Database - required, app won't start without it
  @IsString()
  DATABASE_URL: string;

  // JWT
  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRY: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRY: string = '7d';

  // Google OAuth
  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  GOOGLE_CALLBACK_URL: string;

  // Email (SMTP)
  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT: number = 587;

  @IsBoolean()
  @IsOptional()
  SMTP_SECURE: boolean = false;

  @IsString()
  @IsOptional()
  SMTP_USER: string = '';

  @IsString()
  @IsOptional()
  SMTP_PASS: string = '';

  @IsString()
  @IsOptional()
  EMAIL_FROM: string = 'noreply@example.com';

  // App URL
  @IsString()
  @IsOptional()
  BASE_URL: string = 'http://localhost:3000';

  @IsNumber()
  @IsOptional()
  EMAIL_VERIFICATION_EXPIRY_HOURS: number = 24;

  // Security
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = '*';

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 100;
}

// Called by ConfigModule at startup with the raw process.env object.
// plainToInstance converts string values to the correct types.
// validateSync checks all decorators - throws if anything is invalid.
export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { whitelist: true });

  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n${errors.toString()}`);
  }

  return validated;
}
