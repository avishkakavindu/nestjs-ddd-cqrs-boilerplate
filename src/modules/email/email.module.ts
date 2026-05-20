import { Module } from '@nestjs/common';

import { AppMailerModule } from '../app-mailer/app-mailer.module';
import { EmailService } from './email.service';

// Business-layer email module.
// Import this (not AppMailerModule) wherever email sending is needed.
@Module({
  imports: [AppMailerModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
