import { decrypt } from '@/lib/encryption';

export class MetaAdapter {
  /**
   * Dispatches WhatsApp message using WhatsApp Business Cloud API.
   */
  static async sendWhatsApp(
    phoneNumberId: string,
    encryptedToken: string,
    toPhone: string,
    content: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log(`[MetaAdapter] Dispatching WhatsApp to ${toPhone}`);

    // Sandbox / Mock Bypass
    if (phoneNumberId.startsWith('mock_') || !encryptedToken) {
      console.log('[MetaAdapter] Mock WhatsApp Dispatch Successful.');
      return { success: true, externalId: `mock_wa_out_${Date.now()}` };
    }

    try {
      const systemToken = decrypt(encryptedToken);
      // Clean phone to numeric only for WhatsApp API
      const cleanTo = toPhone.replace('+', '').trim();

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
          text: {
            preview_url: false,
            body: content
          }
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

  /**
   * Dispatches Facebook Messenger message using Page Messages API.
   */
  static async sendFacebook(
    pageId: string,
    encryptedToken: string,
    recipientPsid: string,
    content: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log(`[MetaAdapter] Dispatching Facebook Messenger to PSID ${recipientPsid}`);

    if (pageId.startsWith('mock_') || !encryptedToken) {
      console.log('[MetaAdapter] Mock Facebook Messenger Dispatch Successful.');
      return { success: true, externalId: `mock_fb_out_${Date.now()}` };
    }

    try {
      const pageAccessToken = decrypt(encryptedToken);

      const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: {
            id: recipientPsid
          },
          message: {
            text: content
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
  static async sendInstagram(
    instagramBusinessAccountId: string,
    encryptedToken: string,
    recipientIgsid: string,
    content: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    console.log(`[MetaAdapter] Dispatching Instagram DM to IGSID ${recipientIgsid}`);

    if (instagramBusinessAccountId.startsWith('mock_') || !encryptedToken) {
      console.log('[MetaAdapter] Mock Instagram DM Dispatch Successful.');
      return { success: true, externalId: `mock_ig_out_${Date.now()}` };
    }

    try {
      const pageAccessToken = decrypt(encryptedToken);

      // Endpoint is same as Messenger but sends via Instagram Business Account scoping
      const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient: {
            id: recipientIgsid
          },
          message: {
            text: content
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
}
