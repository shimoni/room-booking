// API types matching backend entities

export interface Room {
  id: number;
  title: string;
  description: string;
  location: {
    city: string;
    country: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  price: number;
  capacity: number;
  amenities: string[];
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface SearchRoomsParams {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  limit?: number;
  cursor?: number;
}

export interface SearchRoomsResponse {
  rooms: Room[];
  pagination: {
    limit: number;
    nextCursor: number | null;
    hasMore: boolean;
  };
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface Booking {
  id: number;
  user_id: number;
  room_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  status: BookingStatus;
  total_price: number;
  idempotency_key: string;
  payment_intent_id?: string;
  created_at: string;
  updated_at: string;
  room?: Room;
}

export interface CreateBookingRequest {
  roomId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  idempotencyKey?: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  user: User;
}
