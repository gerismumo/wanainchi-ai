import { strongPassword } from 'src/common/schemas/password.schema';
import { z } from 'zod';



export const signupSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.email(),
  password: strongPassword,
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotSchema = z.object({
  email: z.email(),
  type: z.enum(['password', 'pin']),
});

export const resetSchema = z.object({
    token: z.string(),
    newValue: strongPassword,
    email: z.email(),
  });


export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type SignupDto = z.infer<typeof signupSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type ForgotDto = z.infer<typeof forgotSchema>;
export type ResetDto = z.infer<typeof resetSchema>;
