import { z } from 'zod';

export const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'member', 'client']),
});

export const acceptInviteSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InviteValues = z.infer<typeof inviteSchema>;
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;
