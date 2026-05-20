import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

import { AppConfigModule } from '../../config/config.module';
import { AppConfigService } from '../../config/app-config.service';

// Infrastructure module: owns SMTP transport and Handlebars template engine config.
// Not registered in AppModule directly — imported only by EmailModule.
// Template dir resolves to dist/modules/email/templates/ at runtime.
// The nest-cli.json assets rule copies .hbs files there during build.
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        transport: {
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          // Only include auth when credentials are provided.
          // A local Docker SMTP (e.g. Mailpit) accepts connections without auth.
          ...(config.smtpUser &&
            config.smtpPass && {
              auth: { user: config.smtpUser, pass: config.smtpPass },
            }),
        },
        defaults: {
          from: config.emailFrom,
        },
        template: {
          // __dirname at runtime = dist/modules/app-mailer/
          // ../email/templates   = dist/modules/email/templates/
          dir: join(__dirname, '../email/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            // strict: true throws at send time if a template variable is undefined,
            // catching missing context data early rather than silently rendering blanks.
            strict: true,
          },
        },
      }),
    }),
  ],
  exports: [MailerModule],
})
export class AppMailerModule {}
