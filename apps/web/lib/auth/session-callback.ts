import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

/**
 * Handles the session callback in NextAuth to populate session data from the JWT.
 *
 * This function extracts user information from the decoded JWT token and attaches
 * it to the session object, making it accessible via `useSession()` on the client.
 *
 * @param session - The current session object.
 * @param token - The JWT token containing user data.
 * @returns The updated session object with user information.
 */
export const sessionCallback = ({
  session,
  token,
}: {
  session: Session;
  token: JWT;
}): Session => {
  if (session && token.user) {
    session.user = {
      id: token.user.id,
      email: token.user.email,
      first_name: token.user.first_name,
      last_name: token.user.last_name,
      created_at: token.user.created_at,
      updated_at: token.user.updated_at,
    };
  }
  return session;
};
