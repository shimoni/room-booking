import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

/**
 * Determines whether a user is authorized to access a specific route.
 *
 * - Allows unrestricted access to static assets like `/assets` and `/favicon.ico`.
 * - Allows unrestricted access to auth pages (sign-in, sign-up)
 * - Redirects authenticated users away from auth pages to the homepage
 * - Redirects unauthenticated users trying to access any other route to `/auth/sign-in`
 * - All routes except auth pages require authentication
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

  // Only auth pages are public (sign-in and sign-up)
  const publicRoutes = ['/auth/sign-in', '/auth/sign-up'];

  const isPublicRoute = publicRoutes.includes(pathname);

  // Redirect authenticated users away from auth pages to homepage
  if (isAuth && pathname.startsWith('/auth/sign')) {
    return Response.redirect(new URL('/', nextUrl));
  }

  // Allow unauthenticated access to public routes only
  if (!isAuth && isPublicRoute) {
    return true;
  }

  // Redirect unauthenticated users to sign-in for all other routes
  if (!isAuth) {
    const signInUrl = new URL('/auth/sign-in', nextUrl);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(signInUrl);
  }

  // Allow access to authenticated users
  return true;
};
