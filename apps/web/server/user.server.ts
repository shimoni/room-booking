import {
  GetAllUsers,
  GetAllUsersSchema,
  GetUserSchema,
  User,
} from '@/types/user.type';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Helper function to get cookie header string from Next.js cookies
 */
const getCookieHeader = async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
};

/**
 * Get all users
 * Uses direct fetch with Next.js caching (ISR with 5 minute revalidation)
 * Requires authentication - forwards cookies to backend
 * @returns GetAllUsers
 */
export const getAllUsers = async (): Promise<GetAllUsers> => {
  try {
    const cookieHeader = await getCookieHeader();
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        Cookie: cookieHeader,
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
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
 * Get user by identifier (Email or Username)
 * Uses direct fetch with Next.js caching (ISR with 5 minute revalidation)
 * Requires authentication - forwards cookies to backend
 * @param identifier
 * @returns User | null
 */
export const getUser = async (identifier: string): Promise<User | null> => {
  try {
    const cookieHeader = await getCookieHeader();
    const response = await fetch(`${API_URL}/users/${identifier}`, {
      headers: {
        Cookie: cookieHeader,
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
