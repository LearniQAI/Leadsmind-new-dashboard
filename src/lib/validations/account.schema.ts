import { z } from 'zod'

export const profileSchema = z.object({
 firstName: z.string().min(1, 'First name is required'),
 lastName: z.string().optional(),
 avatarUrl: z.string().url().optional().or(z.literal('')),
 avatarPresetId: z.string().optional().or(z.literal('')),
 jobTitle: z.string().optional().or(z.literal('')),
 phone: z.string().optional().or(z.literal('')),
 profilePhotoUrl: z.string().url().optional().or(z.literal('')),
 identityColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color').optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export const passwordSchema = z.object({
 currentPassword: z.string().min(1, 'Current password is required'),
 newPassword: z.string().min(8, 'Password must be at least 8 characters'),
 confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
 message: "Passwords don't match",
 path: ['confirmPassword'],
})

export type PasswordFormValues = z.infer<typeof passwordSchema>
