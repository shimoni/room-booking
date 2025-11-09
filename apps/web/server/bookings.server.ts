'use server';

import { safeAction } from '@/lib';
import {
  Booking,
  CreateBookingResponseSchema,
  CreateBookingSchema,
  GetBookingResponseSchema,
} from '@/types/booking.type';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Create a new booking (protected action)
 * Requires authentication - forwards cookies to backend
 * @schema CreateBookingSchema
 */
export const createBooking = safeAction
  .schema(CreateBookingSchema)
  .action(async ({ parsedInput }) => {
    const idempotencyKey = parsedInput.idempotencyKey || randomUUID();

    // Get cookies to forward for authentication
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': idempotencyKey,
        Cookie: cookieHeader, // Forward authentication cookies
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
 * Get booking details by ID (protected endpoint)
 * Requires authentication - forwards cookies to backend
 * Uses direct fetch with Next.js caching (ISR with 5 minute revalidation)
 * @param bookingId - Booking ID
 * @returns Booking details or null
 */
export const getBooking = async (
  bookingId: number,
): Promise<Booking | null> => {
  try {
    // Get cookies to forward for authentication
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      headers: {
        Cookie: cookieHeader, // Forward authentication cookies
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
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
