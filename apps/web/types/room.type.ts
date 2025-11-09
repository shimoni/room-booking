import { z } from 'zod';

/**
 * Schema for room location
 */
export const RoomLocationSchema = z.object({
  city: z.string(),
  country: z.string(),
  address: z.string(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export type RoomLocation = z.infer<typeof RoomLocationSchema>;

/**
 * Schema for a room entity
 */
export const RoomSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  location: RoomLocationSchema,
  price: z.number(),
  capacity: z.number(),
  amenities: z.array(z.string()).nullish(),
  images: z.array(z.string()).nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Room = z.infer<typeof RoomSchema>;

/**
 * Schema for room search filters - all fields optional
 */
export const SearchRoomsSchema = z.object({
  location: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  minPrice: z.coerce.number().min(1).optional(),
  maxPrice: z.coerce.number().min(1).optional(),
  capacity: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).default(10).optional(),
  cursor: z.coerce.number().min(0).optional(),
});

export type SearchRoomsParams = z.infer<typeof SearchRoomsSchema>;

/**
 * Schema for room search response (matches backend structure)
 */
export const SearchRoomsResponseSchema = z.object({
  rooms: z.array(RoomSchema),
  pagination: z.object({
    limit: z.number(),
    nextCursor: z.number().nullable(),
    hasMore: z.boolean(),
  }),
});

export type SearchRoomsResponse = z.infer<typeof SearchRoomsResponseSchema>;

/**
 * Schema for room details response (backend returns room directly, not wrapped)
 */
export const GetRoomResponseSchema = RoomSchema;

export type GetRoomResponse = z.infer<typeof GetRoomResponseSchema>;

/**
 * Schema for room availability check
 */
export const CheckAvailabilityResponseSchema = z.object({
  roomId: z.number(),
  checkIn: z.string(),
  checkOut: z.string(),
  available: z.boolean(),
});

export type CheckAvailabilityResponse = z.infer<
  typeof CheckAvailabilityResponseSchema
>;
