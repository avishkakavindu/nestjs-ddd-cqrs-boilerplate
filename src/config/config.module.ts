import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigService } from './app-config.service';
import { validate } from './env.validation';

// @Global() means we import this module ONCE in AppModule,
// and AppConfigService becomes available everywhere without re-importing.
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      // Reads the .env file in the project root
      envFilePath: '.env',
      // Runs our validate() function at startup — app refuses to boot if invalid
      validate,
      // Makes ConfigService available globally (needed by AppConfigService)
      isGlobal: true,
    }),
  ],
  providers: [AppConfigService],
  // Export so other modules can inject AppConfigService
  exports: [AppConfigService],
})
export class AppConfigModule {}
