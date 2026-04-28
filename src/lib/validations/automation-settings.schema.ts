import { z } from 'zod';

export const automationSettingsSchema = z.object({
  resend_api_key: z.string().optional().or(z.literal('')),
  email_from_name: z.string().min(1, 'From name is required').max(50),
  email_from_address: z.string().email('Invalid email address'),
  twilio_sid: z.string().optional().or(z.literal('')),
  twilio_token: z.string().optional().or(z.literal('')),
  twilio_number: z.string().optional().or(z.literal('')),
  webhook_secret: z.string().optional().or(z.literal('')),
});

export type AutomationSettingsValues = z.infer<typeof automationSettingsSchema>;
