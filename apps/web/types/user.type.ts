import { z } from 'zod';

/**
 * Schema representing a user object from the backend.
 */
export const UserSchema = z.object({
  id: z.coerce.number(),
  email: z.string().email(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * Schema for a response containing a single user.
 */
export const GetUserSchema = z.object({
  data: UserSchema,
});
export type GetUser = z.infer<typeof GetUserSchema>;

/**
 * Schema for a response containing multiple users.
 */
export const GetAllUsersSchema = z.object({
  data: z.array(UserSchema),
});
export type GetAllUsers = z.infer<typeof GetAllUsersSchema>;
