export type MessagingPlatform = 'email' | 'sms' | 'whatsapp' | 'instagram' | 'linkedin';

export type PlatformConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface PlatformConnection {
  id: string;
  workspaceId: string;
  platform: MessagingPlatform;
  credentials: Record<string, any>;
  status: PlatformConnectionStatus;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // or WhatsApp Number
}
