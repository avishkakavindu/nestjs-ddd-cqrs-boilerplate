import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './helpers/create-app';
import { cleanDatabase } from './helpers/db-cleaner';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await app.close();
  });

  it('GET /api/v1/health returns 200', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
});
