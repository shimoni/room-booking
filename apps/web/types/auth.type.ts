import { UserSchema } from '@/types/user.type';
import { z } from 'zod';

/**
 * Schema for validating password strength.
 */
const passWordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /\d/.test(val), {
    message: 'Password must contain at least one number',
  })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
    message: 'Password must contain at least one special character',
  });

/**
 * Schema for user sign-up.
 */
export const SignUpSchema = z.object({
  email: z.string().email(),
  password: passWordSchema,
});

export type SignUp = z.infer<typeof SignUpSchema>;

/**
 * Schema for user sign-in using either email or username.
 */
export const SignInSchema = z.object({
  identifier: z.string().min(1, {
    message: 'Email or Username is required!',
  }),
  password: z.string().min(1, {
    message: 'Password is required!',
  }),
});

export type SignIn = z.infer<typeof SignInSchema>;

/**
 * Schema for sign-in response data (tokens are in httpOnly cookies).
 */
export const SignInDataSchema = z.object({
  user: UserSchema,
});

export type SignInData = z.infer<typeof SignInDataSchema>;
