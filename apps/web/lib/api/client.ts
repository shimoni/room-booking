import type {
  AuthResponse,
  Booking,
  CreateBookingRequest,
  Room,
  SearchRoomsParams,
  SearchRoomsResponse,
  SignInRequest,
  SignUpRequest,
  User,
} from '@/types/api.type';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * API client error
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Important: Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || 'API request failed',
      errorData,
    );
  }

  return response.json();
}

/**
 * Server-side API client that forwards cookies from request
 * Use this in Server Components and Server Actions
 */
export async function createServerApiClient() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  return {
    async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      return apiFetch<T>(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: cookieHeader, // Forward cookies to backend
        },
      });
    },
  };
}

/**
 * Client-side API client
 * Use this in Client Components
 */
export const api = {
  // Authentication
  async signIn(data: SignInRequest): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    return apiFetch<AuthResponse>('/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async signOut(): Promise<void> {
    return apiFetch<void>('/auth/sign-out', {
      method: 'POST',
    });
  },

  async getMe(): Promise<User> {
    return apiFetch<User>('/auth/me');
  },

  async refreshToken(): Promise<void> {
    return apiFetch<void>('/auth/refresh', {
      method: 'POST',
    });
  },

  // Rooms
  async searchRooms(params: SearchRoomsParams): Promise<SearchRoomsResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiFetch<SearchRoomsResponse>(
      `/rooms/search?${queryParams.toString()}`,
    );
  },

  async getRoomById(id: number): Promise<Room> {
    return apiFetch<Room>(`/rooms/${id}`);
  },

  async checkRoomAvailability(
    id: number,
    checkIn: string,
    checkOut: string,
  ): Promise<{
    roomId: number;
    checkIn: string;
    checkOut: string;
    available: boolean;
  }> {
    return apiFetch(
      `/rooms/${id}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
    );
  },

  // Bookings
  async createBooking(
    data: CreateBookingRequest,
    idempotencyKey?: string,
  ): Promise<Booking> {
    return apiFetch<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
    });
  },

  async getBooking(id: number): Promise<Booking> {
    return apiFetch<Booking>(`/bookings/${id}`);
  },
};

/**
 * Server-side API methods
 * Use these in Server Components
 */
export async function serverSearchRooms(
  params: SearchRoomsParams,
): Promise<SearchRoomsResponse> {
  const client = await createServerApiClient();
  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  return client.fetch<SearchRoomsResponse>(
    `/rooms/search?${queryParams.toString()}`,
  );
}

export async function serverGetRoomById(id: number): Promise<Room> {
  const client = await createServerApiClient();
  return client.fetch<Room>(`/rooms/${id}`);
}

export async function serverGetBooking(id: number): Promise<Booking> {
  const client = await createServerApiClient();
  return client.fetch<Booking>(`/bookings/${id}`);
}

export async function serverGetMe(): Promise<User> {
  const client = await createServerApiClient();
  return client.fetch<User>('/auth/me');
}
