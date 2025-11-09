import 'next-auth';
import { User } from 'next-auth';

/**
 * Module augmentation for next-auth to extend User, Session, and JWT interfaces.
 */
declare module 'next-auth' {
  /**
   * The shape of the user object returned in the OAuth providers' callback,
   * or the second parameter of the `session` callback, when using a database.
   *
   * @interface User
   * @property {number} id - Unique identifier for the user.
   * @property {string} email - User's email address.
   * @property {string | null} [first_name] - User's first name.
   * @property {string | null} [last_name] - User's last name.
   * @property {Date} created_at - Date when the user was created.
   * @property {Date} updated_at - Date when the user was last updated.
   */
  interface User {
    id: number;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    created_at: Date;
    updated_at: Date;
  }

  /**
   * Returned by `useSession`, `auth`, contains information about the active session.
   *
   * @interface Session
   * @property {User} user - The authenticated user.
   */
  interface Session {
    user: User;
  }
}

// The `JWT` interface can be found in the `next-auth/jwt` submodule
import 'next-auth/jwt';

/**
 * Module augmentation for next-auth/jwt to extend JWT interface.
 *
 * @interface JWT
 * @property {User} user - The user object stored in the JWT.
 */
declare module 'next-auth/jwt' {
  interface JWT {
    user: User;
  }
}
