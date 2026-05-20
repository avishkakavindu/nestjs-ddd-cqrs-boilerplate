import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { AppModule } from '../../src/app.module';
import { EmailService } from '../../src/modules/email/email.service';
import { PrismaService } from '../../src/prisma/prisma.service';

// Shared mock — tests can inspect calls (e.g. emailService.sendVerificationEmail.mock.calls)
export const emailService = {
  sendVerificationEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
};

export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  moduleRef: TestingModule;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(emailService)
    .compile();

  const app = moduleRef.createNestApplication();

  // Mirror main.ts bootstrap exactly so the test environment matches production
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const prisma = moduleRef.get(PrismaService);
  return { app, prisma, moduleRef };
}
