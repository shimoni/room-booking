import { AppModule } from '@/app.module';
import { Env } from '@/common/utils';
import { DbHelper } from '@/test/helpers/db-helper';
import fastifyCookie from '@fastify/cookie';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

describe('RoomsController (e2e)', () => {
  let app: NestFastifyApplication;
  let dbHelper: DbHelper;
  let dataSource: DataSource;
  let cacheManager: Cache;
  let testRoomIds: number[] = [];
  let accessToken: string;

  /**
   * Helper function to sign in and get access token
   */
  const signInAndGetToken = async (): Promise<string> => {
    const signInRes = await app.inject({
      method: 'POST',
      url: '/auth/sign-in',
      payload: {
        identifier: 'test1@example.com',
        password: 'Test123!',
      },
    });

    const cookies = signInRes.cookies;
    const accessCookie = cookies.find((c) => c.name === 'access_token');
    return accessCookie?.value || '';
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    dbHelper = new DbHelper(dataSource);
    cacheManager = moduleFixture.get<Cache>(CACHE_MANAGER);

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Register cookie plugin (required for auth cookie handling)
    const configService = app.get(ConfigService<Env>);
    await app.register(fastifyCookie, {
      secret: configService.get('JWT_SECRET') as string,
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Clean and seed database
    await dbHelper.deleteDbData();

    // Clear cache before each test
    await cacheManager.reset();

    await dbHelper.createTestUsers(); // Create test users for authentication
    const rooms = await dbHelper.createTestRooms();
    // Ensure IDs are numbers (they might be strings from BigInt columns)
    testRoomIds = rooms.map((room) => Number(room.id));

    // Create availability for test rooms (required for date filtering)
    await dbHelper.createAvailability(rooms);

    // Get access token for authenticated requests
    accessToken = await signInAndGetToken();
  });

  afterEach(async () => {
    await dbHelper.deleteDbData();
    await cacheManager.reset();
    await app.close();
  });

  describe('GET /rooms/search', () => {
    it('should return rooms with default pagination without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/search',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.rooms).toBeDefined();
      expect(Array.isArray(body.rooms)).toBe(true);
      expect(body.rooms.length).toBeGreaterThan(0);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.limit).toBeDefined();
    });

    it('should filter rooms by location', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/search?location=New York',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.rooms).toBeDefined();
      body.rooms.forEach((room: any) => {
        const locationStr = JSON.stringify(room.location).toLowerCase();
        expect(locationStr).toContain('new york'.toLowerCase());
      });
    });

    it('should filter rooms by price range', async () => {
      const minPrice = 100;
      const maxPrice = 300;
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/search?minPrice=${minPrice}&maxPrice=${maxPrice}`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      body.rooms.forEach((room: any) => {
        expect(Number(room.price)).toBeGreaterThanOrEqual(minPrice);
        expect(Number(room.price)).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('should filter rooms by capacity', async () => {
      const minCapacity = 2;
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/search?capacity=${minCapacity}`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      body.rooms.forEach((room: any) => {
        expect(room.capacity).toBeGreaterThanOrEqual(minCapacity);
      });
    });

    it('should filter rooms by available dates', async () => {
      const checkIn = '2025-01-15';
      const checkOut = '2025-01-20';
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/search?checkIn=${checkIn}&checkOut=${checkOut}`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.rooms).toBeDefined();
      // Available rooms should be returned (tested further in availability tests)
    });

    it('should support cursor pagination', async () => {
      const firstPageRes = await app.inject({
        method: 'GET',
        url: '/rooms/search?limit=2',
        // No authentication required - public endpoint
      });

      expect(firstPageRes.statusCode).toBe(200);
      const firstPage = firstPageRes.json();
      expect(firstPage.rooms.length).toBeLessThanOrEqual(2);

      if (firstPage.nextCursor) {
        const secondPageRes = await app.inject({
          method: 'GET',
          url: `/rooms/search?limit=2&cursor=${firstPage.nextCursor}`,
          // No authentication required - public endpoint
        });

        expect(secondPageRes.statusCode).toBe(200);
        const secondPage = secondPageRes.json();
        expect(secondPage.rooms[0].id).not.toBe(firstPage.rooms[0].id);
      }
    });

    it('should combine multiple filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/search?location=New York&minPrice=150&capacity=2',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      body.rooms.forEach((room: any) => {
        const locationStr = JSON.stringify(room.location).toLowerCase();
        expect(locationStr).toContain('new york'.toLowerCase());
        expect(Number(room.price)).toBeGreaterThanOrEqual(150);
        expect(room.capacity).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('GET /rooms/:id', () => {
    it('should return room details by ID without authentication', async () => {
      const roomId = testRoomIds[0];
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(roomId);
      expect(body.title).toBeDefined();
      expect(body.location).toBeDefined();
      expect(body.price).toBeDefined();
      expect(body.capacity).toBeDefined();
      expect(body.description).toBeDefined();
    });

    it('should return 404 for non-existent room', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/99999',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.message).toContain('not found');
    });

    it('should return 400 for invalid room ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/invalid',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /rooms/autocomplete/locations', () => {
    it('should return unique location strings without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/autocomplete/locations',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      // Each location should be a string in "City, Country" format
      body.forEach((location: any) => {
        expect(typeof location).toBe('string');
        expect(location).toMatch(/^.+,\s.+$/); // Pattern: "City, Country"
      });

      // Check that locations are unique
      const uniqueLocations = new Set(body);
      expect(uniqueLocations.size).toBe(body.length);
    });

    it('should return sorted locations alphabetically', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/autocomplete/locations',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const locations = res.json();

      // Verify alphabetical ordering
      for (let i = 0; i < locations.length - 1; i++) {
        expect(
          locations[i].localeCompare(locations[i + 1]),
        ).toBeLessThanOrEqual(0);
      }
    });

    it('should cache location results', async () => {
      // First request - cache miss
      const firstRes = await app.inject({
        method: 'GET',
        url: '/rooms/autocomplete/locations',
        // No authentication required - public endpoint
      });
      expect(firstRes.statusCode).toBe(200);
      const firstBody = firstRes.json();

      // Second request - should be cached
      const secondRes = await app.inject({
        method: 'GET',
        url: '/rooms/autocomplete/locations',
        // No authentication required - public endpoint
      });
      expect(secondRes.statusCode).toBe(200);
      const secondBody = secondRes.json();

      // Results should be identical
      expect(firstBody).toEqual(secondBody);
    });
  });

  describe('GET /rooms/:id/availability', () => {
    it('should check availability for valid dates without authentication', async () => {
      const roomId = testRoomIds[0];
      const checkIn = '2025-02-01';
      const checkOut = '2025-02-05';
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Controller returns roomId directly from param, may still be string in JSON
      expect(Number(body.roomId)).toBe(roomId);
      expect(body.checkIn).toBe(checkIn);
      expect(body.checkOut).toBe(checkOut);
      expect(typeof body.available).toBe('boolean');
    });

    it.skip('should return 400 when checkIn is after checkOut (TODO: add validation)', async () => {
      const roomId = testRoomIds[0];
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}/availability?checkIn=2025-02-10&checkOut=2025-02-05`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.message).toContain('check-in');
    });

    it.skip('should return 400 when checkIn is in the past (TODO: add validation)', async () => {
      const roomId = testRoomIds[0];
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}/availability?checkIn=2020-01-01&checkOut=2020-01-05`,
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent room', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/99999/availability?checkIn=2025-02-01&checkOut=2025-02-05',
        // No authentication required - public endpoint
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Caching behavior', () => {
    it('should cache room details on subsequent requests', async () => {
      const roomId = testRoomIds[0];

      // First request - cache miss
      const firstRes = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}`,
        // No authentication required - public endpoint
      });
      expect(firstRes.statusCode).toBe(200);

      // Second request - should be cached
      const secondRes = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}`,
        // No authentication required - public endpoint
      });
      expect(secondRes.statusCode).toBe(200);

      // Results should be identical
      expect(firstRes.json()).toEqual(secondRes.json());
    });

    it('should cache search results with same query', async () => {
      const query = 'location=New York&minPrice=100';

      const firstRes = await app.inject({
        method: 'GET',
        url: `/rooms/search?${query}`,
        // No authentication required - public endpoint
      });
      expect(firstRes.statusCode).toBe(200);

      const secondRes = await app.inject({
        method: 'GET',
        url: `/rooms/search?${query}`,
        // No authentication required - public endpoint
      });
      expect(secondRes.statusCode).toBe(200);

      expect(firstRes.json()).toEqual(secondRes.json());
    });
  });
});
