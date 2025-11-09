'use server';

import { signIn, signOut } from '@/auth';
import { safeAction, safeFetch } from '@/lib';
import { getDeviceInfo } from '@/lib/device';
import {
  type SignIn,
  SignInDataSchema,
  SignInSchema,
  SignUpSchema,
} from '@/types/auth.type';
import { DefaultReturnSchema } from '@/types/default.type';
import { AuthError, User } from 'next-auth';
import { revalidateTag } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Parses and sends credential-based login with device info to backend.
 * Forwards backend cookies (access_token, refresh_token) to the browser
 * @param credentials
 */
export const authorizeSignIn = async (
  credentials: SignIn,
): Promise<null | User> => {
  try {
    const deviceInfo = await getDeviceInfo();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Make direct fetch call to get response with cookies
    const response = await fetch(`${API_URL}/auth/sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        ...credentials,
        ...deviceInfo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[authorizeSignIn] API error:', errorData);
      return null;
    }

    const data = await response.json();
    const parsed = SignInDataSchema.safeParse(data);

    if (!parsed.success) {
      console.error('[authorizeSignIn] Validation error:', parsed.error);
      return null;
    }

    // Extract and forward cookies from backend response to browser
    const setCookieHeaders = response.headers.getSetCookie();
    const cookieStore = await cookies();

    for (const cookieHeader of setCookieHeaders) {
      // Parse the cookie header to extract name, value, and options
      const [nameValue, ...options] = cookieHeader.split(';');
      if (!nameValue) continue;

      const parts = nameValue.split('=');
      const name = parts[0]?.trim();
      const value = parts.slice(1).join('=').trim(); // Handle values with '=' in them

      if (!name || !value) continue;

      // Parse cookie options
      const cookieOptions: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
        maxAge?: number;
        path?: string;
      } = {};

      options.forEach((opt) => {
        const [key, val] = opt.split('=').map((s) => s?.trim().toLowerCase());
        if (!key) return;

        if (key === 'httponly') cookieOptions.httpOnly = true;
        if (key === 'secure') cookieOptions.secure = true;
        if (key === 'samesite' && val)
          cookieOptions.sameSite = val as 'lax' | 'strict' | 'none';
        if (key === 'max-age' && val) cookieOptions.maxAge = parseInt(val);
        if (key === 'path' && val) cookieOptions.path = val;
      });

      // Set cookie in Next.js response
      cookieStore.set(name, value, cookieOptions);
    }

    const { user } = parsed.data;
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  } catch (error) {
    console.error('[authorizeSignIn] Unexpected error:', error);
    return null;
  }
};

/**
 * UI Sign-in action using credentials.
 * @schema SignInSchema
 */
export const signInWithCredentials = safeAction
  .schema(SignInSchema)
  .action(async ({ parsedInput }) => {
    try {
      await signIn('credentials', parsedInput);
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.type === 'CredentialsSignin') {
          throw new Error('Invalid credentials.');
        }
        throw new Error('Something went wrong.');
      }
      if (isRedirectError(error)) {
        revalidateTag('/auth/sign-in');
        redirect('/');
      }
    }
  });

/**
 * UI Sign-up action with redirect to sign-in page.
 * @schema SignUpSchema
 */
export const signUpWithCredentials = safeAction
  .schema(SignUpSchema)
  .action(async ({ parsedInput }) => {
    const [error] = await safeFetch(DefaultReturnSchema, '/auth/sign-up', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(parsedInput),
    });

    if (error) throw error;

    // Redirect to sign-in page after successful signup
    redirect('/auth/sign-in');
  });

/**
 * Sign out from current device.
 */
export const signOutCurrentDevice = safeAction.action(async () => {
  await signOut({ redirect: true, redirectTo: '/' });
  return 'success';
});
