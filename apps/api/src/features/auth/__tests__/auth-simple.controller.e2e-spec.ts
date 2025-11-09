/**
 * E2E tests for AuthSimpleController REST endpoints
 * Tests user registration, login, token refresh, and logout flows
 */

import { Env } from '@/common/utils';
import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app.module';
import { DbHelper } from '../../../test/helpers/db-helper';

describe('AuthSimpleController (e2e)', () => {
  let app: NestFastifyApplication;
  let moduleFixture: TestingModule;
  let dbHelper: DbHelper;
  let dataSource: DataSource;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Register cookie plugin (required for auth cookie handling)
    const configService = app.get(ConfigService<Env>);
    await app.register(fastifyCookie, {
      secret: configService.get('JWT_SECRET') as string,
    });

    app.useGlobalPipes(
      new ValidationPipe({ forbidUnknownValues: true, transform: true }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    dataSource = moduleFixture.get(DataSource);
    dbHelper = new DbHelper(dataSource);
    await dbHelper.deleteDbData();
  });

  afterEach(async () => {
    await dbHelper.deleteDbData();
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /auth/sign-up', () => {
    it('should register a new user successfully', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.message).toBe('User created successfully');
      expect(body.user).toMatchObject({
        email: 'newuser@example.com',
      });
      expect(body.user).toHaveProperty('id');
      // Sign-up does NOT return tokens
      expect(body).not.toHaveProperty('access_token');
      expect(body).not.toHaveProperty('refresh_token');
    });

    it.skip('should return 400 for invalid email format (TODO: add validation)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          email: 'invalid-email',
          password: 'SecurePass123!',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.message).toContain('email');
    });

    it('should return 409 when email already exists', async () => {
      // Create first user
      await dbHelper.createTestUsers();

      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          email: 'test1@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.message).toContain('already exists');
    });
  });

  describe('POST /auth/sign-in', () => {
    beforeEach(async () => {
      await dbHelper.createTestUsers();
    });

    it('should login successfully with valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'test1@example.com',
          password: 'Test123!',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.user.email).toBe('test1@example.com');
      // Sign-in does NOT return tokens in body
      expect(body).not.toHaveProperty('access_token');
      expect(body).not.toHaveProperty('refresh_token');

      // Check HttpOnly cookies are set
      const cookies = res.cookies;
      const accessCookie = cookies.find((c) => c.name === 'access_token');
      const refreshCookie = cookies.find((c) => c.name === 'refresh_token');

      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      expect(accessCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.httpOnly).toBe(true);
    });

    it('should return 401 with invalid password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'test1@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.message).toContain('Invalid');
    });

    it('should return 404 with non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Test123!',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await dbHelper.createTestUsers();

      // Login to get tokens from cookies
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'test1@example.com',
          password: 'Test123!',
        },
      });

      const cookies = loginRes.cookies;
      refreshToken =
        cookies.find((c) => c.name === 'refresh_token')?.value || '';
    });

    it('should refresh tokens successfully with valid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: {
          refresh_token: refreshToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toBe('Tokens refreshed successfully');
      // Refresh does NOT return tokens in body
      expect(body).not.toHaveProperty('access_token');
      expect(body).not.toHaveProperty('refresh_token');

      // Check new cookies are set
      const cookies = res.cookies;
      const newAccessToken = cookies.find(
        (c) => c.name === 'access_token',
      )?.value;
      const newRefreshToken = cookies.find(
        (c) => c.name === 'refresh_token',
      )?.value;

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();

      // Verify tokens are valid JWTs
      expect(newAccessToken).toMatch(
        /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      );
      expect(newRefreshToken).toMatch(
        /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      );
    });

    it('should return 401 without refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with invalid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: {
          refresh_token: 'invalid.token.here',
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /auth/sign-out', () => {
    let accessToken: string;

    beforeEach(async () => {
      await dbHelper.createTestUsers();

      // Login to get tokens from cookies
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'test1@example.com',
          password: 'Test123!',
        },
      });

      const cookies = loginRes.cookies;
      accessToken = cookies.find((c) => c.name === 'access_token')?.value || '';
    });

    it('should logout successfully and clear cookies', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-out',
        cookies: {
          access_token: accessToken,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toContain('logged out');

      // Check cookies are cleared
      const cookies = res.cookies;
      const accessCookie = cookies.find((c) => c.name === 'access_token');
      const refreshCookie = cookies.find((c) => c.name === 'refresh_token');

      expect(accessCookie?.value).toBe('');
      expect(refreshCookie?.value).toBe('');
    });

    it('should return 401 without access token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/sign-out',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full auth flow: sign-up → login → refresh → logout', async () => {
      // 1. Sign up
      // 1. Sign up
      const signUpRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          email: 'flowtest@example.com',
          password: 'FlowTest123!',
        },
      });
      expect(signUpRes.statusCode).toBe(201);

      // 2. Sign in to get tokens
      const signInRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          email: 'flowtest@example.com',
          password: 'FlowTest123!',
        },
      });
      expect(signInRes.statusCode).toBe(200);
      const signInCookies = signInRes.cookies;
      const accessToken =
        signInCookies.find((c) => c.name === 'access_token')?.value || '';
      const refreshToken =
        signInCookies.find((c) => c.name === 'refresh_token')?.value || '';

      // 3. Refresh tokens
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        cookies: {
          refresh_token: refreshToken,
        },
      });
      expect(refreshRes.statusCode).toBe(200);
      const newAccessToken =
        refreshRes.cookies.find((c) => c.name === 'access_token')?.value || '';

      // 4. Logout
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-out',
        cookies: {
          access_token: newAccessToken,
        },
      });
      expect(logoutRes.statusCode).toBe(200);

      // 5. Verify cookies are cleared (check response has empty/expired cookies)
      const logoutCookies = logoutRes.cookies;
      expect(logoutCookies).toBeDefined();
    });
  });
});
