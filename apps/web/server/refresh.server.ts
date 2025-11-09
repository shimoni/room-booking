'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RefreshTokenResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to refresh the access token
 * This can be called from client components when they receive a 401 error
 *
 * @returns Success status
 */
export async function refreshAccessToken(): Promise<RefreshTokenResult> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      console.log('[refreshAccessToken] No refresh token available');
      return { success: false, error: 'No refresh token' };
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
      return { success: false, error: 'Refresh failed' };
    }

    // Extract new tokens from Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie();

    if (setCookieHeaders.length === 0) {
      console.log('[refreshAccessToken] No cookies in refresh response');
      return { success: false, error: 'No cookies returned' };
    }

    // Parse and set new cookies
    for (const setCookie of setCookieHeaders) {
      const [cookiePart] = setCookie.split(';');
      if (!cookiePart) continue;

      const [name, value] = cookiePart.split('=');

      if (name && value) {
        // Parse cookie attributes
        const attributes: {
          httpOnly: boolean;
          sameSite: 'lax' | 'strict' | 'none';
          path: string;
          maxAge?: number;
          secure?: boolean;
        } = { httpOnly: true, sameSite: 'lax', path: '/' };

        const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/i);
        if (maxAgeMatch?.[1]) {
          attributes.maxAge = parseInt(maxAgeMatch[1], 10);
        }

        const secureMatch = setCookie.match(/Secure/i);
        if (secureMatch) {
          attributes.secure = true;
        }

        cookieStore.set(name, value, attributes);
      }
    }

    console.log('[refreshAccessToken] Successfully refreshed tokens');
    return { success: true };
  } catch (error) {
    console.error('[refreshAccessToken] Error:', error);
    return { success: false, error: 'Unknown error' };
  }
}
