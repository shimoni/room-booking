/**
 * Client-side authenticated fetch with automatic token refresh
 *
 * This utility provides a fetch wrapper for client components that:
 * - Automatically includes credentials (cookies)
 * - Detects 401 responses and calls server action to refresh token
 * - Retries the original request after successful refresh
 *
 * Usage in client components:
 * ```typescript
 * 'use client';
 * import { apiFetchClient } from '@/lib/apiFetchClient';
 *
 * const response = await apiFetchClient('/rooms/search');
 * const data = await response.json();
 * ```
 */

import { refreshAccessToken } from '@/server/refresh.server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiFetchOptions extends RequestInit {
  skipRefresh?: boolean; // Skip token refresh attempt
}

/**
 * Authenticated client-side fetch with automatic token refresh
 *
 * @param endpoint - API endpoint path (e.g., '/rooms/search')
 * @param options - Fetch options
 * @returns Response object
 */
export async function apiFetchClient(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { skipRefresh = false, ...fetchOptions } = options;

  // Ensure credentials are included
  const requestOptions: RequestInit = {
    ...fetchOptions,
    credentials: 'include',
  };

  // Make initial request
  let response = await fetch(`${API_URL}${endpoint}`, requestOptions);

  // If we get 401, try to refresh token and retry
  if (response.status === 401 && !skipRefresh) {
    console.log('[apiFetchClient] Got 401, attempting token refresh');

    try {
      const refreshResult = await refreshAccessToken();

      if (refreshResult.success) {
        console.log('[apiFetchClient] Token refreshed, retrying request');

        // Retry the original request
        response = await fetch(`${API_URL}${endpoint}`, requestOptions);

        console.log('[apiFetchClient] Retry status:', response.status);
      } else {
        console.log(
          '[apiFetchClient] Token refresh failed:',
          refreshResult.error,
        );
      }
    } catch (error) {
      console.error('[apiFetchClient] Error during token refresh:', error);
    }
  }

  return response;
}

/**
 * Client-side authenticated fetch with JSON parsing and automatic token refresh
 *
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Parsed JSON response or null on error
 */
export async function apiFetchClientJson<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T | null> {
  try {
    const response = await apiFetchClient(endpoint, options);

    if (!response.ok) {
      console.error(
        `[apiFetchClientJson] HTTP error! status: ${response.status}`,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[apiFetchClientJson] Error:', error);
    return null;
  }
}
