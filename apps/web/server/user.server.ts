import {
  GetAllUsers,
  GetAllUsersSchema,
  GetUserSchema,
  User,
} from '@/types/user.type';
import { apiFetchReadOnly } from './api.server';

/**
 * Get all users
 * No Next.js caching - relies on backend Redis cache
 * Requires authentication - forwards cookies to backend (read-only, no token refresh)
 * @returns GetAllUsers
 */
export const getAllUsers = async (): Promise<GetAllUsers> => {
  try {
    const response = await apiFetchReadOnly('/users', {
      cache: 'no-store', // No Next.js cache - backend has Redis cache
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const parsed = GetAllUsersSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[getAllUsers] Validation error:', parsed.error);
      return { data: [] };
    }

    return parsed.data;
  } catch (error) {
    console.error('[getAllUsers] Error:', error);
    return { data: [] };
  }
};

/**
 * Get user by identifier
 * No Next.js caching - relies on backend Redis cache
 * Requires authentication - forwards cookies to backend (read-only, no token refresh)
 * @param identifier - User ID or username
 * @returns User
 */
export const getUser = async (identifier: string): Promise<User | null> => {
  try {
    const response = await apiFetchReadOnly(`/users/${identifier}`, {
      cache: 'no-store', // No Next.js cache - backend has Redis cache
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const parsed = GetUserSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[getUser] Validation error:', parsed.error);
      return null;
    }

    return parsed.data.data;
  } catch (error) {
    console.error('[getUser] Error:', error);
    return null;
  }
};
