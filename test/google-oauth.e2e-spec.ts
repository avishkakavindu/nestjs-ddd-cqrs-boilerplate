import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { GoogleAuthGuard } from '../src/modules/auth/guards/google-auth.guard';
import type { GoogleProfile } from '../src/modules/auth/google-profile.interface';
import { EmailService } from '../src/modules/email/email.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './helpers/db-cleaner';
import { emailService } from './helpers/create-app';

// Module-level profile — tests reassign this before each scenario.
// The mock guard reads it at request time, so tests get full control.
let fakeProfile: GoogleProfile = {
  googleId: 'g-test-123',
  email: 'google@example.com',
  firstName: 'Google',
  lastName: 'User',
};

class MockGoogleAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user: GoogleProfile }>();
    req.user = fakeProfile;
    return true;
  }
}

describe('Google OAuth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const CALLBACK = '/api/v1/auth/google/callback';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .overrideGuard(GoogleAuthGuard)
      .useClass(MockGoogleAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    jest.clearAllMocks();
    // Reset to a default profile before each test
    fakeProfile = {
      googleId: 'g-test-123',
      email: 'google@example.com',
      firstName: 'Google',
      lastName: 'User',
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe('new Google user', () => {
    it('returns access and refresh tokens', async () => {
      const res = await request(app.getHttpServer()).get(CALLBACK).expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('creates a verified user in the database', async () => {
      await request(app.getHttpServer()).get(CALLBACK).expect(200);

      const user = await prisma.user.findUnique({
        where: { email: fakeProfile.email },
      });
      expect(user).not.toBeNull();
      expect(user!.googleId).toBe(fakeProfile.googleId);
      expect(user!.isEmailVerified).toBe(true);
      expect(user!.passwordHash).toBeNull();
    });
  });

  describe('returning Google user', () => {
    it('returns tokens without creating a duplicate user', async () => {
      // first login creates the user
      await request(app.getHttpServer()).get(CALLBACK).expect(200);
      const countAfterFirst = await prisma.user.count();

      // second login reuses the existing user
      await request(app.getHttpServer()).get(CALLBACK).expect(200);
      const countAfterSecond = await prisma.user.count();

      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  describe('account linking — email already registered via password', () => {
    it('links the Google account to the existing user', async () => {
      // Register a password user with the same email
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email: fakeProfile.email,
          firstName: fakeProfile.firstName,
          lastName: fakeProfile.lastName,
          password: 'SecurePass123!',
        })
        .expect(201);

      // Google login with the same email should link, not create a new user
      await request(app.getHttpServer()).get(CALLBACK).expect(200);

      const users = await prisma.user.findMany({
        where: { email: fakeProfile.email },
      });
      expect(users).toHaveLength(1);
      expect(users[0].googleId).toBe(fakeProfile.googleId);
    });

    it('returns tokens after linking', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email: fakeProfile.email,
          firstName: fakeProfile.firstName,
          lastName: fakeProfile.lastName,
          password: 'SecurePass123!',
        })
        .expect(201);

      const res = await request(app.getHttpServer()).get(CALLBACK).expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });
  });
});
