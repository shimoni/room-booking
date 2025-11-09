'use server';

import { safeAction } from '@/lib';
import {
  Booking,
  CreateBookingResponseSchema,
  CreateBookingSchema,
  GetBookingResponseSchema,
} from '@/types/booking.type';
import { randomUUID } from 'crypto';
import { apiFetch, apiFetchReadOnly } from './api.server';

/**
 * Create a new booking (protected action)
 * Requires authentication - forwards cookies to backend with auto token refresh
 * @schema CreateBookingSchema
 */
export const createBooking = safeAction
  .schema(CreateBookingSchema)
  .action(async ({ parsedInput }) => {
    const idempotencyKey = parsedInput.idempotencyKey || randomUUID();

    const response = await apiFetch('/bookings', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        roomId: parsedInput.roomId,
        checkIn: parsedInput.checkIn,
        checkOut: parsedInput.checkOut,
        guests: parsedInput.guests,
        idempotencyKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create booking');
    }

    const data = await response.json();
    const parsed = CreateBookingResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[createBooking] Validation error:', parsed.error);
      throw new Error('Invalid response format');
    }

    return parsed.data;
  });

/**
 * Get booking by ID
 * Uses direct fetch with Next.js caching (ISR with 5 minute revalidation)
 * Requires authentication - forwards cookies to backend (read-only, no token refresh)
 * @param bookingId - Booking ID
 * @returns Booking details or null
 */
export const getBooking = async (
  bookingId: number,
): Promise<Booking | null> => {
  try {
    const response = await apiFetchReadOnly(`/bookings/${bookingId}`, {
      cache: 'no-store', // No Next.js cache - backend has Redis cache
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const parsed = GetBookingResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[getBooking] Validation error:', parsed.error);
      return null;
    }

    return parsed.data.data;
  } catch (error) {
    console.error('[getBooking] Error:', error);
    return null;
  }
};
