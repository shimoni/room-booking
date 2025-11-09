/**
 * Server-side API fetch utility with automatic token refresh
 *
 * This module provides centralized fetch utilities for server-side API calls:
 *
 * ## Two Functions for Different Contexts:
 *
 * 1. **apiFetch** - For Server Actions (can refresh tokens)
 *    - Automatically forwards authentication cookies
 *    - Detects 401 responses and refreshes access token
 *    - Sets new cookies after refresh
 *    - ⚠️ Can only be used in Server Actions or Route Handlers
 *
 * 2. **apiFetchReadOnly** - For Server Components (read-only)
 *    - Forwards authentication cookies
 *    - Does NOT attempt token refresh (can't set cookies)
 *    - Use for data fetching in Server Components
 *
 * ## Usage Examples:
 *
 * ```typescript
 * import { apiFetch, apiFetchReadOnly } from '@/server/api.server';
 *
 * // In Server Actions (can refresh tokens):
 * 'use server';
 * export async function createBooking() {
 *   const response = await apiFetch('/bookings', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *     cache: 'no-store',
 *   });
 * }
 *
 * // In Server Components (read-only):
 * export default async function RoomsPage() {
 *   const response = await apiFetchReadOnly('/rooms/search', {
 *     next: { revalidate: 300 }
 *   });
 *   const rooms = await response.json();
 *   return <RoomList rooms={rooms} />;
 * }
 * ```
 *
 * ## Why Two Functions?
 *
 * Next.js 15 restricts cookie modification to Server Actions and Route Handlers only.
 * Server Components can read cookies but cannot set them. Therefore:
 * - Use `apiFetch` in Server Actions when you need token refresh capability
 * - Use `apiFetchReadOnly` in Server Components for read-only data fetching
 *
 * If a Server Component gets a 401, the user will need to re-authenticate.
 */

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean; // Skip token refresh logic (for refresh endpoint itself)
}

/**
 * Get all cookies as a Cookie header string
 */
const getCookieHeader = async (): Promise<string> => {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
};

interface RefreshResult {
  success: boolean;
  newCookies?: Map<string, { value: string; attributes: CookieAttributes }>;
}

interface CookieAttributes {
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
  secure?: boolean;
}

/**
 * Attempt to refresh the access token using the refresh token
 * Returns new cookie values that need to be set by a Server Action
 * @returns RefreshResult with new cookies to set
 */
const refreshAccessToken = async (): Promise<RefreshResult> => {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      console.log('[refreshAccessToken] No refresh token available');
      return { success: false };
    }

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.log('[refreshAccessToken] Refresh failed:', response.status);
      return { success: false };
    }

    // Extract new tokens from Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie();

    if (setCookieHeaders.length === 0) {
      console.log('[refreshAccessToken] No cookies in refresh response');
      return { success: false };
    }

    // Parse cookies to return (not set them here)
    const newCookies = new Map<
      string,
      { value: string; attributes: CookieAttributes }
    >();

    for (const setCookie of setCookieHeaders) {
      const [cookiePart] = setCookie.split(';');
      if (!cookiePart) continue;

      const [name, value] = cookiePart.split('=');

      if (name && value) {
        // Parse additional cookie attributes
        const attributes: CookieAttributes = {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        };

        const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/i);
        if (maxAgeMatch?.[1]) {
          attributes.maxAge = parseInt(maxAgeMatch[1], 10);
        }

        const secureMatch = setCookie.match(/Secure/i);
        if (secureMatch) {
          attributes.secure = true;
        }

        newCookies.set(name, { value, attributes });
      }
    }

    console.log('[refreshAccessToken] Successfully refreshed tokens');
    return { success: true, newCookies };
  } catch (error) {
    console.error('[refreshAccessToken] Error:', error);
    return { success: false };
  }
};

/**
 * Authenticated server-side fetch with automatic token refresh
 *
 * IMPORTANT: Can only be used in Server Actions or Route Handlers due to cookie setting restrictions.
 * For regular Server Components that only read data, use apiFetchReadOnly instead.
 *
 * Usage:
 * ```
 * 'use server'; // Must be a server action
 *
 * const data = await apiFetch('/rooms/search');
 * const room = await apiFetch(`/rooms/${id}`);
 * ```
 *
 * @param endpoint - API endpoint path (e.g., '/rooms/search')
 * @param options - Fetch options
 * @returns Response object
 */
export const apiFetch = async (
  endpoint: string,
  options: FetchOptions = {},
): Promise<Response> => {
  const { skipRefresh = false, ...fetchOptions } = options;

  // Get cookie header
  const cookieHeader = await getCookieHeader();

  // Merge headers
  const headers = {
    ...fetchOptions.headers,
    Cookie: cookieHeader,
  };

  // Make initial request
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // If we get 401 and have a refresh token, try to refresh and retry
  if (response.status === 401 && !skipRefresh) {
    console.log('[apiFetch] Got 401, attempting token refresh');

    const refreshResult = await refreshAccessToken();

    if (refreshResult.success && refreshResult.newCookies) {
      // Set the new cookies (only works in Server Actions)
      const cookieStore = await cookies();
      for (const [name, { value, attributes }] of refreshResult.newCookies) {
        cookieStore.set(name, value, attributes);
      }

      // Retry the original request with new tokens
      const newCookieHeader = await getCookieHeader();
      const newHeaders = {
        ...fetchOptions.headers,
        Cookie: newCookieHeader,
      };

      response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers: newHeaders,
      });

      console.log('[apiFetch] Retry after refresh:', response.status);
    }
  }

  return response;
};

/**
 * Read-only authenticated fetch for Server Components
 *
 * Does NOT attempt token refresh (can't set cookies in Server Components).
 * Use this for data fetching in Server Components that don't modify state.
 *
 * If you get 401 errors, the user needs to re-authenticate via a Server Action.
 *
 * Usage:
 * ```
 * // In Server Component
 * const rooms = await apiFetchReadOnly('/rooms/search');
 * ```
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Response object
 */
export const apiFetchReadOnly = async (
  endpoint: string,
  options: Omit<FetchOptions, 'skipRefresh'> = {},
): Promise<Response> => {
  const cookieHeader = await getCookieHeader();

  const headers = {
    ...options.headers,
    Cookie: cookieHeader,
  };

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
};

/**
 * Authenticated server-side fetch with JSON parsing and automatic token refresh
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Parsed JSON response or null on error
 */
export const apiFetchJson = async <T = unknown>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T | null> => {
  try {
    const response = await apiFetch(endpoint, options);

    if (!response.ok) {
      console.error(`[apiFetchJson] HTTP error! status: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[apiFetchJson] Error:', error);
    return null;
  }
};
