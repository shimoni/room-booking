import { triggerType } from '@/lib/auth';
import { Session, User } from 'next-auth';
import { AdapterUser } from 'next-auth/adapters';
import { JWT } from 'next-auth/jwt';

/**
 * Handles the JWT callback in NextAuth to customize the token payload.
 *
 * When triggered by "update", merges the session user data into the existing token.
 * When triggered by "signIn", initializes the token with detailed user information.
 *
 * @param token - The current JWT token.
 * @param user - The user object returned on sign-in or adapter user.
 * @param trigger - The trigger event, e.g. 'signIn' or 'update'.
 * @param session - The current session data.
 * @returns The updated JWT token.
 */
export const jwtCallback = ({
  token,
  user,
  trigger,
  session,
}: {
  token: JWT;
  user: User | AdapterUser;
  trigger: triggerType;
  session: Session;
}): JWT => {
  if (trigger === 'update') {
    return {
      ...token,
      user: {
        ...token.user,
        ...session.user,
      },
    };
  }

  if (trigger === 'signIn') {
    if (user && 'id' in user) {
      return {
        ...token,
        user: {
          id: user.id as number,
          email: user.email as string,
          first_name: (user as User).first_name,
          last_name: (user as User).last_name,
          created_at: (user as User).created_at,
          updated_at: (user as User).updated_at,
        },
      };
    }
  }

  return token;
};
