import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Routes decorated with @Public() are skipped by JwtAuthGuard.
// All other routes require a valid access token by default.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
