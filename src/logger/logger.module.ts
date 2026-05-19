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

          // Redact sensitive headers from logs
          redact: ['req.headers.authorization', 'req.headers.cookie'],

          // In development: log only what's useful — method, url, status, response time
          // In production: keep full request detail for debugging
          serializers: config.isProduction
            ? undefined
            : {
                req: (req: { method: string; url: string }) => ({
                  method: req.method,
                  url: req.url,
                }),
                res: (res: { statusCode: number }) => ({
                  statusCode: res.statusCode,
                }),
              },
        },
      }),
    }),
  ],
})
export class LoggerModule {}
