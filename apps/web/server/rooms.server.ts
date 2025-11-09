import {
  CheckAvailabilityResponseSchema,
  GetRoomResponseSchema,
  Room,
  SearchRoomsParams,
  SearchRoomsResponseSchema,
} from '@/types/room.type';
import { buildSearchParams } from '@repo/utils';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Helper function to get cookies and create Cookie header
 */
const getCookieHeader = async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
};

/**
 * Search rooms with filters
 * Uses direct fetch with Next.js caching (ISR with 5 minute revalidation)
 * Requires authentication - forwards cookies to backend
 * @param params - Search parameters (location, dates, capacity, price)
 * @returns Search results with rooms and pagination
 */
export const searchRooms = async (params: SearchRoomsParams) => {
  try {
    const cookieHeader = await getCookieHeader();
    const searchParams = buildSearchParams(params);
    const response = await fetch(`${API_URL}/rooms/search?${searchParams}`, {
      headers: {
        Cookie: cookieHeader,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

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
 * Uses direct fetch with Next.js caching (ISR with 30 minute revalidation)
 * Requires authentication - forwards cookies to backend
 * @param roomId - Room ID
 * @returns Room details
 */
export const getRoom = async (roomId: number): Promise<Room | null> => {
  try {
    const cookieHeader = await getCookieHeader();
    const response = await fetch(`${API_URL}/rooms/${roomId}`, {
      headers: {
        Cookie: cookieHeader,
      },
      next: { revalidate: 1800 }, // Cache for 30 minutes
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
 * Uses direct fetch with Next.js caching (ISR with 5 minute revalidation)
 * Requires authentication - forwards cookies to backend
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
    const cookieHeader = await getCookieHeader();
    const response = await fetch(
      `${API_URL}/rooms/${roomId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
      {
        headers: {
          Cookie: cookieHeader,
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
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
