import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AppI18nModule } from './i18n/i18n.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    PrismaModule,
    HealthModule,
    AppI18nModule,
    CommonModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        { ttl: config.throttleTtl, limit: config.throttleLimit },
      ],
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
