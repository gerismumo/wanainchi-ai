import { strongPassword } from 'src/common/schemas/password.schema';
import { z } from 'zod';

const pinSchema = z.string().length(4).regex(/^\d+$/, 'PIN must be 4 digits');

export const deleteUserSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('password'),
    value: strongPassword,
  }),
  z.object({
    type: z.literal('pin'),
    value: pinSchema,
  }),
]);
export const updatePasswordSchema = z.object({
  password: strongPassword,
});

export const userSchema = z.object({
  first_name: z
    .string()
    .min(2, { message: 'First name must be at least 2 characters long' })
    .max(500, { message: 'First name cannot exceed 50 characters' }),

  last_name: z
    .string()
    .min(2, { message: 'Last name must be at least 2 characters long' })
    .max(500, { message: 'Last name cannot exceed 50 characters' }),

  phone_number: z
    .string()
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .max(15, { message: 'Phone number cannot exceed 15 digits' })
    .optional(),

  is_active: z
    .preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean({
        message: 'active must be true or false',
      }),
    )
    .optional()
    .default(true),

  email: z.email({ message: 'Please enter a valid email address' }),

  password: strongPassword,
  roles: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }

      return value;
    },
    z
      .array(
        z.uuid({
          message: 'Each role must be a valid UUID',
        }),
      )
      .min(1, {
        message: 'At least one role must be selected',
      }),
  ),
});

export const updateUserSchema = z.object({
  first_name: z
    .string()
    .min(2, { message: 'First name must be at least 2 characters long' })
    .max(500, { message: 'First name cannot exceed 50 characters' }),

  last_name: z
    .string()
    .min(2, { message: 'Last name must be at least 2 characters long' })
    .max(500, { message: 'Last name cannot exceed 50 characters' }),

  phone_number: z
    .string()
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .max(15, { message: 'Phone number cannot exceed 15 digits' })
    .optional(),

  is_active: z
    .preprocess(
      (val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      },
      z.boolean({
        message: 'active must be true or false',
      }),
    )
    .optional()
    .default(true),

  email: z.email({ message: 'Please enter a valid email address' }),
  roles: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }

      return value;
    },
    z
      .array(
        z.uuid({
          message: 'Each role must be a valid UUID',
        }),
      )
      .min(1, {
        message: 'At least one role must be selected',
      }),
  ),
  avatar_url: z.string().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export type UserDto = z.infer<typeof userSchema>;

export type DeleteUserDto = z.infer<typeof deleteUserSchema>;

export type UpdatePasswordDto = z.infer<typeof updatePasswordSchema>;
