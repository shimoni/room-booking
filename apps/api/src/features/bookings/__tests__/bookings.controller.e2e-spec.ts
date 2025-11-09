import { AppModule } from '@/app.module';
import { DbHelper } from '@/test/helpers/db-helper';
import fastifyCookie from '@fastify/cookie';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

describe('BookingsController (e2e)', () => {
  let app: NestFastifyApplication;
  let dbHelper: DbHelper;
  let dataSource: DataSource;
  let cacheManager: Cache;
  let accessToken: string;
  let userId: number;
  let testRoomId: number;

  /**
   * Helper function to generate valid booking dates within the availability window
   * Availability is created for 30 days from today
   */
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

    // Register cookie plugin for auth
    await app.register(fastifyCookie);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Clean and seed database
    await dbHelper.deleteDbData();

    // Clear cache before each test
    await cacheManager.reset();

    // Create test user
    const users = await dbHelper.createTestUsers();
    userId = Number(users[0].id);

    // Create test rooms
    const rooms = await dbHelper.createTestRooms();
    testRoomId = Number(rooms[0].id);

    // Create availability for test rooms
    await dbHelper.createAvailability(rooms);

    // Get auth token
    const authRes = await app.inject({
      method: 'POST',
      url: '/auth/sign-in',
      payload: {
        identifier: 'test1@example.com',
        password: 'Test123!',
      },
    });

    const cookies = authRes.cookies;
    accessToken = cookies.find((c) => c.name === 'access_token')?.value || '';
  });

  afterEach(async () => {
    await dbHelper.deleteDbData();
    await cacheManager.reset();
    await app.close();
  });

  describe('POST /bookings', () => {
    it('should create a booking successfully', async () => {
      const bookingData = {
        roomId: testRoomId,
        checkIn: '2025-12-01',
        checkOut: '2025-12-05',
        guests: 2,
        idempotencyKey: 'test-booking-1',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: bookingData,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toBeDefined();
      expect(body.room_id).toBe(testRoomId);
      expect(body.user_id).toBe(userId);
      expect(body.guests).toBe(2);
      expect(body.status).toBe('CONFIRMED');
      expect(body.idempotency_key).toBe('test-booking-1');
      expect(body.total_price).toBeDefined();
      expect(Number(body.total_price)).toBeGreaterThan(0);
    });

    it('should return same booking for duplicate idempotency key', async () => {
      const bookingData = {
        roomId: testRoomId,
        checkIn: '2025-12-10',
        checkOut: '2025-12-15',
        guests: 2,
        idempotencyKey: 'test-idempotency-duplicate',
      };

      // First request
      const res1 = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: bookingData,
      });

      expect(res1.statusCode).toBe(201);
      const body1 = res1.json();
      const firstBookingId = body1.id;

      // Second request with same idempotency key
      const res2 = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: bookingData,
      });

      // Should return the same booking (implementation returns 201, not 200)
      expect(res2.statusCode).toBe(201);
      const body2 = res2.json();
      expect(body2.id).toBe(firstBookingId);
      expect(body2.idempotency_key).toBe('test-idempotency-duplicate');
    });

    it('should accept idempotency key from header', async () => {
      const bookingData = {
        roomId: testRoomId,
        checkIn: '2025-12-20',
        checkOut: '2025-12-25',
        guests: 2, // Must be <= room capacity
      };

      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        headers: {
          'x-idempotency-key': 'header-idempotency-key',
        },
        payload: bookingData,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.idempotency_key).toBe('header-idempotency-key');
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        payload: {
          roomId: testRoomId,
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for invalid dates (checkIn after checkOut)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2025-12-10',
          checkOut: '2025-12-05',
          guests: 2,
          idempotencyKey: 'invalid-dates',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.message).toContain('check-in');
    });

    it('should return 409 when room is not available', async () => {
      // Create first booking
      const bookingData1 = {
        roomId: testRoomId,
        checkIn: '2026-01-10',
        checkOut: '2026-01-15',
        guests: 2,
        idempotencyKey: 'booking-1',
      };

      const res1 = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: bookingData1,
      });
      expect(res1.statusCode).toBe(201);

      // Try to book same dates (overlapping)
      const bookingData2 = {
        roomId: testRoomId,
        checkIn: '2026-01-12',
        checkOut: '2026-01-17',
        guests: 2,
        idempotencyKey: 'booking-2',
      };

      const res2 = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: bookingData2,
      });

      expect(res2.statusCode).toBe(409);
      const body = res2.json();
      expect(body.message).toContain('already booked or held');
    });

    it('should return 404 for non-existent room', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: 99999,
          checkIn: '2025-12-01',
          checkOut: '2025-12-05',
          guests: 2,
          idempotencyKey: 'nonexistent-room',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /bookings/:id', () => {
    let bookingId: number;

    beforeEach(async () => {
      // Create a booking first
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2026-02-01',
          checkOut: '2026-02-05',
          guests: 2,
          idempotencyKey: `get-test-${Date.now()}`,
        },
      });
      bookingId = res.json().id;
    });

    it('should get booking by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/bookings/${bookingId}`,
        cookies: { access_token: accessToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(bookingId);
      expect(body.user_id).toBe(userId);
      expect(body.room_id).toBe(testRoomId);
    });

    it('should return 404 for non-existent booking', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/bookings/99999',
        cookies: { access_token: accessToken },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when accessing another user booking', async () => {
      // Create another user
      const otherUserRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        payload: {
          email: 'other@example.com',
          password: 'Test123!@',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      const otherAuthRes = await app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        payload: {
          identifier: 'other@example.com',
          password: 'Test123!@',
        },
      });

      const otherToken =
        otherAuthRes.cookies.find((c) => c.name === 'access_token')?.value ||
        '';

      // Try to access first user's booking - returns 404 for security (don't reveal booking exists)
      const res = await app.inject({
        method: 'GET',
        url: `/bookings/${bookingId}`,
        cookies: { access_token: otherToken },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/bookings/${bookingId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe.skip('GET /bookings/me/list', () => {
    beforeEach(async () => {
      // Create multiple bookings
      await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2026-03-01',
          checkOut: '2026-03-05',
          guests: 2,
          idempotencyKey: `list-test-1-${Date.now()}`,
        },
      });

      await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2026-04-01',
          checkOut: '2026-04-05',
          guests: 3,
          idempotencyKey: `list-test-2-${Date.now()}`,
        },
      });
    });

    it('should list all user bookings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/bookings/me/list',
        cookies: { access_token: accessToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      body.forEach((booking: any) => {
        expect(booking.user_id).toBe(userId);
      });
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/bookings/me/list',
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe.skip('DELETE /bookings/:id', () => {
    let bookingId: number;

    beforeEach(async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2026-05-01',
          checkOut: '2026-05-05',
          guests: 2,
          idempotencyKey: `cancel-test-${Date.now()}`,
        },
      });
      bookingId = res.json().id;
    });

    it('should cancel booking successfully', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/bookings/${bookingId}`,
        cookies: { access_token: accessToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toContain('cancelled');

      // Verify booking is cancelled
      const getRes = await app.inject({
        method: 'GET',
        url: `/bookings/${bookingId}`,
        cookies: { access_token: accessToken },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().status).toBe('CANCELLED');
    });

    it('should return 404 for non-existent booking', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/bookings/99999',
        cookies: { access_token: accessToken },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/bookings/${bookingId}`,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Concurrency Tests', () => {
    it('should handle concurrent booking attempts for same room/dates', async () => {
      const bookingData = {
        roomId: testRoomId,
        checkIn: '2026-06-01',
        checkOut: '2026-06-05',
        guests: 2,
      };

      // Make 5 concurrent requests with different idempotency keys
      const requests = Array.from({ length: 5 }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/bookings',
          cookies: { access_token: accessToken },
          payload: {
            ...bookingData,
            idempotencyKey: `concurrent-${Date.now()}-${i}`,
          },
        }),
      );

      const results = await Promise.all(requests);

      // Only one should succeed with 201
      const successCount = results.filter((r) => r.statusCode === 201).length;
      const conflictCount = results.filter((r) => r.statusCode === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);
    });
  });

  describe('Payment Integration', () => {
    it('should handle payment failure gracefully', async () => {
      // This test depends on the payments service returning failures
      // We'll check that booking handles it properly
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2026-07-01',
          checkOut: '2026-07-05',
          guests: 2,
          idempotencyKey: `payment-test-${Date.now()}`,
        },
      });

      // Payment might fail (5% chance based on service)
      if (res.statusCode === 402) {
        const body = res.json();
        expect(body.message).toContain('payment');
      } else if (res.statusCode === 400) {
        console.log('Payment test got 400:', res.json());
        expect(res.statusCode).toBe(201); // Will fail to show error
      } else {
        // If payment succeeded, booking should be created
        expect(res.statusCode).toBe(201);
      }
    });

    it('should reject booking for dates without availability records', async () => {
      // Try to book dates in 2030 - should have no availability records
      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: '2030-06-01',
          checkOut: '2030-06-10',
          guests: 2,
          idempotencyKey: `future-booking-${Date.now()}`,
        },
      });

      // Should fail because there are no availability records for 2030
      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.message).toContain('not available');
    });

    it('should reject booking for dates partially without availability records', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkIn = new Date(today);
      checkIn.setDate(checkIn.getDate() + 5);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 5);

      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];

      // Delete one day's availability record
      const midDate = new Date(checkIn);
      midDate.setDate(midDate.getDate() + 2);
      const midDateStr = midDate.toISOString().split('T')[0];

      await dataSource.query(
        `DELETE FROM availability WHERE room_id = ? AND date = ?`,
        [testRoomId, midDateStr],
      );

      const res = await app.inject({
        method: 'POST',
        url: '/bookings',
        cookies: { access_token: accessToken },
        payload: {
          roomId: testRoomId,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          guests: 2,
          idempotencyKey: `partial-avail-${Date.now()}`,
        },
      });

      // Should fail because some dates are missing availability records
      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.message).toContain('not available');
    });
  });
});
