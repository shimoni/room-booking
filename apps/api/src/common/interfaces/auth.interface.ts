import { User } from '@/features/users/entities/user.entity';

/**
 * Authenticated user from JWT payload
 */
export interface AuthenticatedUser {
  userId: number;
  email: string;
}

/**
 * Request with authenticated user
 */
export interface RequestWithUser {
  user: AuthenticatedUser;
}

/**
 * User response without sensitive fields
 */
export type UserResponse = Omit<
  User,
  'password_hash' | 'hashPassword' | 'bookings' | 'convertBigIntToNumber'
>;

/**
 * Generic message response
 */
export interface MessageResponse {
  message: string;
}

/**
 * Authentication tokens
 */
export interface AuthTokensInterface {
  access_token: string;
  refresh_token: string;
}
