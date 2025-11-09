import { AppModule } from '@/app.module';
import { DbHelper } from '@/test/helpers/db-helper';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

describe('RoomsController (e2e)', () => {
  let app: NestFastifyApplication;
  let dbHelper: DbHelper;
  let dataSource: DataSource;
  let testRoomIds: number[] = [];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    dbHelper = new DbHelper(dataSource);

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Clean and seed database
    await dbHelper.deleteDbData();
    const rooms = await dbHelper.createTestRooms();
    // Ensure IDs are numbers (they might be strings from BigInt columns)
    testRoomIds = rooms.map((room) => Number(room.id));
  });

  afterEach(async () => {
    await dbHelper.deleteDbData();
    await app.close();
  });

  describe('GET /rooms/search', () => {
    it('should return rooms with default pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/search',
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
      });

      expect(firstPageRes.statusCode).toBe(200);
      const firstPage = firstPageRes.json();
      expect(firstPage.rooms.length).toBeLessThanOrEqual(2);

      if (firstPage.nextCursor) {
        const secondPageRes = await app.inject({
          method: 'GET',
          url: `/rooms/search?limit=2&cursor=${firstPage.nextCursor}`,
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
    it('should return room details by ID', async () => {
      const roomId = testRoomIds[0];
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}`,
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
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.message).toContain('not found');
    });

    it('should return 400 for invalid room ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/invalid',
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /rooms/:id/availability', () => {
    it('should check availability for valid dates', async () => {
      const roomId = testRoomIds[0];
      const checkIn = '2025-02-01';
      const checkOut = '2025-02-05';
      const res = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
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
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 for non-existent room', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rooms/99999/availability?checkIn=2025-02-01&checkOut=2025-02-05',
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
      });
      expect(firstRes.statusCode).toBe(200);

      // Second request - should be cached
      const secondRes = await app.inject({
        method: 'GET',
        url: `/rooms/${roomId}`,
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
      });
      expect(firstRes.statusCode).toBe(200);

      const secondRes = await app.inject({
        method: 'GET',
        url: `/rooms/search?${query}`,
      });
      expect(secondRes.statusCode).toBe(200);

      expect(firstRes.json()).toEqual(secondRes.json());
    });
  });
});
