import { env } from '@/lib/env';
import {
  CheckAvailabilityResponseSchema,
  GetRoomResponseSchema,
  Room,
  SearchRoomsParams,
  SearchRoomsResponseSchema,
} from '@/types/room.type';
import { buildSearchParams } from '@repo/utils';

/**
 * Search rooms with filters
 * Public endpoint - no authentication required
 * No Next.js caching - relies on backend Redis cache
 * @param params - Search parameters (location, dates, capacity, price)
 * @returns Search results with rooms and pagination
 */
export const searchRooms = async (params: SearchRoomsParams) => {
  try {
    const searchParams = buildSearchParams(params);
    const response = await fetch(
      `${env.API_URL}/rooms/search?${searchParams}`,
      {
        cache: 'no-store', // No Next.js cache - backend has Redis cache
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const parsed = SearchRoomsResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[searchRooms] Validation error:', parsed.error);
      throw new Error('Invalid response format');
    }

    return parsed.data;
  } catch (error) {
    console.error('[searchRooms] Error:', error);
    return {
      rooms: [],
      pagination: {
        limit: 10,
        nextCursor: null,
        hasMore: false,
      },
    };
  }
};

/**
 * Get room details by ID
 * Public endpoint - no authentication required
 * No Next.js caching - relies on backend Redis cache
 * @param roomId - Room ID
 * @returns Room details
 */
export const getRoom = async (roomId: number): Promise<Room | null> => {
  try {
    const response = await fetch(`${env.API_URL}/rooms/${roomId}`, {
      cache: 'no-store', // No Next.js cache - backend has Redis cache
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const parsed = GetRoomResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[getRoom] Validation error:', parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('[getRoom] Error:', error);
    return null;
  }
};

/**
 * Check room availability for given dates
 * Public endpoint - no authentication required
 * No Next.js caching - relies on backend Redis cache
 * @param roomId - Room ID
 * @param checkIn - Check-in date (ISO string)
 * @param checkOut - Check-out date (ISO string)
 * @returns Availability status
 */
export const checkRoomAvailability = async (
  roomId: number,
  checkIn: string,
  checkOut: string,
) => {
  try {
    const response = await fetch(
      `${env.API_URL}/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
      {
        cache: 'no-store', // No Next.js cache - backend has Redis cache
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const parsed = CheckAvailabilityResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[checkRoomAvailability] Validation error:', parsed.error);
      return {
        roomId,
        checkIn,
        checkOut,
        available: false,
      };
    }

    return parsed.data;
  } catch (error) {
    console.error('[checkRoomAvailability] Error:', error);
    return {
      roomId,
      checkIn,
      checkOut,
      available: false,
    };
  }
};
