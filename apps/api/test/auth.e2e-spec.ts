import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Integration test for the auth → identity path. Requires a running Postgres and
 * Redis (see docker-compose or the CI service containers). Uses a unique email
 * per run so it is idempotent.
 */
describe('Auth & identity (e2e)', () => {
  let app: INestApplication;
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'sup3r-secret-pw';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let accessToken: string;

  it('registers a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'E2E User' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('rejects a weak password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `weak_${Date.now()}@example.com`, password: 'short' })
      .expect(400);
  });

  it('requires auth for identity creation', async () => {
    await request(app.getHttpServer())
      .post('/identity')
      .send({ type: 'DOMAIN', value: 'example.com' })
      .expect(401);
  });

  it('creates an identity and refuses to scan it before verification', async () => {
    const created = await request(app.getHttpServer())
      .post('/identity')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'DOMAIN', value: 'example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/scan/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ identityId: created.body.id })
      .expect(400); // not verified yet — the ownership/consent gate
  });
});
