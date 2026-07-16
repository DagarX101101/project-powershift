import { z } from 'zod';
import { Role, UserStatus } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    name: z.string().min(1, 'Name is required'),
    role: z.nativeEnum(Role, { errorMap: () => ({ message: 'Invalid role specified' }) }),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').optional(),
    name: z.string().min(1, 'Name is required').optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  }),
});

export const toggleStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus, { errorMap: () => ({ message: 'Status must be ACTIVE or INACTIVE' }) }),
  }),
});

export const assignMinesSchema = z.object({
  body: z.object({
    mineIds: z.array(z.string().uuid('Mine IDs must be valid UUIDs')),
  }),
});
