import { Module } from '@nestjs/common';

import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, LoggerModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
