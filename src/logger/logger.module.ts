import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          // In development: pretty colorized output
          // In production: raw JSON (one line per request)
          transport: config.isProduction
            ? undefined
            : {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              },

          // Don't log health check endpoint - it's too noisy
          autoLogging: {
            ignore: (req) => req.url === '/api/v1/health',
          },

          // What to include on every log line
          customProps: () => ({ context: 'HTTP' }),

          // Log level based on environment
          level: config.isProduction ? 'info' : 'debug',
        },
      }),
    }),
  ],
})
export class LoggerModule {}
