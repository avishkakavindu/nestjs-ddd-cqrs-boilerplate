import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp } from './helpers/create-app';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const BASE = '/api/v1';
  const REGISTER = `${BASE}/users`;
  const VERIFY = `${BASE}/users/verify-email`;
  const LOGIN = `${BASE}/auth/login`;

  const user = {
    email: 'users-test@example.com',
    firstName: 'Users',
    lastName: 'Test',
    password: 'SecurePass123!',
  };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  // Register, verify, and log in once — shared across all tests in this suite
  beforeEach(async () => {
    await cleanDatabase(prisma);
    jest.clearAllMocks();

    const { body: registered } = await request(app.getHttpServer())
      .post(REGISTER)
      .send(user)
      .expect(201);
    userId = (registered as { id: string }).id;

    const { emailVerificationToken } = await prisma.user.findUniqueOrThrow({
      where: { email: user.email },
      select: { emailVerificationToken: true },
    });
    await request(app.getHttpServer())
      .post(VERIFY)
      .send({ token: emailVerificationToken })
      .expect(200);

    const { body: tokens } = await request(app.getHttpServer())
      .post(LOGIN)
      .send({ email: user.email, password: user.password })
      .expect(200);
    accessToken = (tokens as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Guard protection ---

  describe('protected endpoints — no token', () => {
    it('GET /users returns 401', async () => {
      await request(app.getHttpServer()).get(`${BASE}/users`).expect(401);
    });

    it('GET /users/:id returns 401', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users/${userId}`)
        .expect(401);
    });

    it('PATCH /users/password returns 401', async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/users/password`)
        .send({ currentPassword: user.password, newPassword: 'NewPass456!' })
        .expect(401);
    });
  });

  // --- List users ---

  describe('GET /users', () => {
    it('returns paginated results with the registered user', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/users`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as {
        data: { id: string; email: string }[];
        meta: { total: number };
      };
      expect(body.meta.total).toBeGreaterThanOrEqual(1);
      expect(body.data.some((u) => u.email === user.email)).toBe(true);
    });

    it('respects page and limit query params', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/users?page=1&limit=1`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as { data: unknown[] };
      expect(body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // --- Get single user ---

  describe('GET /users/:id', () => {
    it('returns user data for a valid id', async () => {
      const res = await request(app.getHttpServer())
        .get(`${BASE}/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as { id: string; email: string };
      expect(body.id).toBe(userId);
      expect(body.email).toBe(user.email);
    });

    it('returns 404 for an id that does not exist', async () => {
      await request(app.getHttpServer())
        .get(`${BASE}/users/non-existent-id`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // --- Change password ---

  describe('PATCH /users/password', () => {
    it('returns 204 on a successful password change', async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/users/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: user.password, newPassword: 'NewPass456!' })
        .expect(204);
    });

    it('returns 401 for a wrong current password', async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/users/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPass999!', newPassword: 'NewPass456!' })
        .expect(401);
    });

    it('returns 400 for a new password shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .patch(`${BASE}/users/password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: user.password, newPassword: 'short' })
        .expect(400);
    });
  });
});
