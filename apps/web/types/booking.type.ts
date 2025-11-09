import { z } from 'zod';
import { RoomSchema } from './room.type';

/**
 * Booking status enum
 */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Schema for creating a booking
 */
export const CreateBookingSchema = z.object({
  roomId: z.number().min(1, 'Room ID is required'),
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  guests: z.number().min(1, 'At least 1 guest is required'),
  idempotencyKey: z.string().optional(),
});

export type CreateBookingParams = z.infer<typeof CreateBookingSchema>;

/**
 * Schema for a booking entity
 */
export const BookingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  room_id: z.number(),
  check_in: z.coerce.date(),
  check_out: z.coerce.date(),
  guests: z.number(),
  status: z.nativeEnum(BookingStatus),
  total_price: z.number(),
  idempotency_key: z.string(),
  payment_intent_id: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  room: RoomSchema.optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

/**
 * Schema for booking creation response
 * Backend returns the booking object directly
 */
export const CreateBookingResponseSchema = BookingSchema;

export type CreateBookingResponse = z.infer<typeof CreateBookingResponseSchema>;

/**
 * Schema for get booking response
 */
export const GetBookingResponseSchema = z.object({
  data: BookingSchema,
});

export type GetBookingResponse = z.infer<typeof GetBookingResponseSchema>;
