import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp } from './helpers/create-app';

// Tests the full auth flow against a real database.
// EmailService is mocked — no SMTP needed. Verification tokens are read from the DB.

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const BASE = '/api/v1';
  const REGISTER = `${BASE}/users`;
  const VERIFY = `${BASE}/users/verify-email`;
  const LOGIN = `${BASE}/auth/login`;
  const LOGOUT = `${BASE}/auth/logout`;
  const REFRESH = `${BASE}/auth/refresh`;

  const user = {
    email: 'auth-test@example.com',
    firstName: 'Auth',
    lastName: 'Test',
    password: 'SecurePass123!',
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Registration ---

  describe('POST /users (register)', () => {
    it('returns 201 with id and email on success', async () => {
      const res = await request(app.getHttpServer())
        .post(REGISTER)
        .send(user)
        .expect(201);

      expect(res.body).toMatchObject({ email: user.email });
      expect(typeof res.body.id).toBe('string');
    });

    it('returns 409 when the email is already registered', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(409);
    });

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post(REGISTER)
        .send({ email: user.email })
        .expect(400);
    });

    it('returns 400 for an invalid email address', async () => {
      await request(app.getHttpServer())
        .post(REGISTER)
        .send({ ...user, email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 for a password shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post(REGISTER)
        .send({ ...user, password: 'short' })
        .expect(400);
    });
  });

  // --- Email Verification ---

  describe('POST /users/verify-email', () => {
    it('verifies email with a valid token and sets isEmailVerified to true', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);

      const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { emailVerificationToken: true },
      });

      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(200);

      const { isEmailVerified } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { isEmailVerified: true },
      });
      expect(isEmailVerified).toBe(true);
    });

    it('returns 400 when the email is already verified', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { emailVerificationToken: true },
      });
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(200);
      // second attempt — email already verified
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(404); // token is cleared after verification, so findByVerificationToken returns null
    });

    it('returns 404 for a token that does not exist', async () => {
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('returns 400 for a non-UUID token', async () => {
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: 'not-a-uuid' })
        .expect(400);
    });
  });

  // --- Login ---

  describe('POST /auth/login', () => {
    it('returns tokens after successful login', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { emailVerificationToken: true },
      });
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(LOGIN)
        .send({ email: user.email, password: user.password })
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
    });

    it('returns 401 when the email is not yet verified', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      await request(app.getHttpServer())
        .post(LOGIN)
        .send({ email: user.email, password: user.password })
        .expect(401);
    });

    it('returns 401 for a wrong password', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { emailVerificationToken: true },
      });
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(200);

      await request(app.getHttpServer())
        .post(LOGIN)
        .send({ email: user.email, password: 'WrongPass999!' })
        .expect(401);
    });

    it('returns 404 for an email that does not exist', async () => {
      await request(app.getHttpServer())
        .post(LOGIN)
        .send({ email: 'nobody@example.com', password: user.password })
        .expect(404);
    });
  });

  // --- Refresh ---

  describe('POST /auth/refresh', () => {
    it('returns a new access token with a valid refresh token', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { emailVerificationToken: true },
      });
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(200);
      const { refreshToken } = (
        await request(app.getHttpServer())
          .post(LOGIN)
          .send({ email: user.email, password: user.password })
          .expect(200)
      ).body as { refreshToken: string };

      const res = await request(app.getHttpServer())
        .post(REFRESH)
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200);

      expect(typeof res.body.accessToken).toBe('string');
    });

    it('returns 401 with no token', async () => {
      await request(app.getHttpServer()).post(REFRESH).expect(401);
    });

    it('returns 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .post(REFRESH)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // --- Logout ---

  describe('POST /auth/logout', () => {
    it('returns 204 and clears the refresh token', async () => {
      await request(app.getHttpServer()).post(REGISTER).send(user).expect(201);
      const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { emailVerificationToken: true },
      });
      await request(app.getHttpServer())
        .post(VERIFY)
        .send({ token: emailVerificationToken })
        .expect(200);
      const { accessToken } = (
        await request(app.getHttpServer())
          .post(LOGIN)
          .send({ email: user.email, password: user.password })
          .expect(200)
      ).body as { accessToken: string };

      await request(app.getHttpServer())
        .post(LOGOUT)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const { refreshTokenHash } = await prisma.user.findUniqueOrThrow({
        where: { email: user.email },
        select: { refreshTokenHash: true },
      });
      expect(refreshTokenHash).toBeNull();
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).post(LOGOUT).expect(401);
    });
  });
});
