import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

/**
 * Determines whether a user is authorized to access a specific route.
 *
 * - Allows unrestricted access to static assets like `/assets` and `/favicon.ico`.
 * - Allows unrestricted access to auth pages (sign-in, sign-up)
 * - Allows unrestricted access to ALL room pages (/rooms/*)
 * - Redirects authenticated users away from auth pages to the homepage
 * - Redirects unauthenticated users trying to access protected routes (bookings, profile) to sign-in
 * - Only booking/profile operations require authentication
 *
 * @param request - The incoming request object containing the target route.
 * @param auth - The current session object or null if unauthenticated.
 * @returns A `Response` redirect object if redirection is needed, or `true` if access is allowed.
 */
export const isAuthorized = ({
  request,
  auth,
}: {
  request: NextRequest;
  auth: Session | null;
}) => {
  const isAuth = !!auth?.user;
  const { nextUrl } = request;
  const { pathname } = nextUrl;

  // Allow access to public assets
  if (pathname.startsWith('/assets') || pathname.startsWith('/favicon.ico')) {
    return true;
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/sign-in',
    '/auth/sign-up',
    '/', // Home page (room search)
  ];

  const isPublicRoute =
    publicRoutes.includes(pathname) || pathname.startsWith('/rooms/'); // All room pages are public (search, details, etc.)

  // Redirect authenticated users away from auth pages to homepage
  if (isAuth && pathname.startsWith('/auth/sign')) {
    return Response.redirect(new URL('/', nextUrl));
  }

  // Allow unauthenticated access to public routes
  if (!isAuth && isPublicRoute) {
    return true;
  }

  // Redirect unauthenticated users to sign-in for protected routes (bookings, profile, etc.)
  if (!isAuth) {
    const signInUrl = new URL('/auth/sign-in', nextUrl);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(signInUrl);
  }

  // Allow access to authenticated users
  return true;
};
