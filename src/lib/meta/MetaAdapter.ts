import { decrypt } from '@/lib/encryption';

export class MetaAdapter {
  private credentials: any;

  constructor(credentials: any) {
    this.credentials = credentials;
  }

  /**
   * Dispatches Facebook Messenger message using Page Messages API.
   */
  async sendFacebook(
    recipientId: string,
    text: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log(`[MetaAdapter] Dispatching Facebook Messenger to PSID ${recipientId}`);

    const pageId = this.credentials?.page_id || '';
    const encryptedToken = this.credentials?.page_access_token_encrypted || '';

    if (pageId.startsWith('mock_') || !encryptedToken) {
      console.log('[MetaAdapter] Mock Facebook Messenger Dispatch Successful.');
      return { success: true, externalId: `mock_fb_out_${Date.now()}` };
    }

    try {
      const pageAccessToken = decrypt(encryptedToken);

      const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId
          },
          message: {
            text
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed Facebook Messenger request');
      }

      return { success: true, externalId: data.message_id };
    } catch (e: any) {
      console.error('[MetaAdapter] Facebook Messenger Error:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Dispatches Instagram DM using Meta Instagram Messenger API.
   */
  async sendInstagram(
    recipientId: string,
    text: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log(`[MetaAdapter] Dispatching Instagram DM to IGSID ${recipientId}`);

    const instagramId = this.credentials?.instagram_id || '';
    const encryptedToken = this.credentials?.page_access_token_encrypted || '';

    if (instagramId.startsWith('mock_') || !encryptedToken) {
      console.log('[MetaAdapter] Mock Instagram DM Dispatch Successful.');
      return { success: true, externalId: `mock_ig_out_${Date.now()}` };
    }

    try {
      const pageAccessToken = decrypt(encryptedToken);

      const response = await fetch(`https://graph.facebook.com/v18.0/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId
          },
          message: {
            text
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed Instagram request');
      }

      return { success: true, externalId: data.message_id };
    } catch (e: any) {
      console.error('[MetaAdapter] Instagram DM Error:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Dispatches WhatsApp message using WhatsApp Business Cloud API.
   */
  async sendWhatsApp(
    to: string,
    text: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log(`[MetaAdapter] Dispatching WhatsApp to ${to}`);

    const phoneNumberId = this.credentials?.phone_number_id || '';
    const encryptedToken = this.credentials?.access_token_encrypted || '';

    if (phoneNumberId.startsWith('mock_') || !encryptedToken) {
      console.log('[MetaAdapter] Mock WhatsApp Dispatch Successful.');
      return { success: true, externalId: `mock_wa_out_${Date.now()}` };
    }

    try {
      const systemToken = decrypt(encryptedToken);
      const cleanTo = to.replace('+', '').trim();

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${systemToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: { body: text }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed WhatsApp request');
      }

      return { success: true, externalId: data.messages?.[0]?.id };
    } catch (e: any) {
      console.error('[MetaAdapter] WhatsApp Error:', e.message);
      return { success: false, error: e.message };
    }
  }
}
