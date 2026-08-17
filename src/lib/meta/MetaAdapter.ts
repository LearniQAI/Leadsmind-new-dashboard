import { decrypt } from '@/lib/encryption';
import { logger } from '@/shared/logger';

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
    logger.info({ recipientId }, 'meta_adapter.facebook.dispatching');

    const pageId = this.credentials?.page_id || '';
    const encryptedToken = this.credentials?.page_access_token_encrypted || '';

    if (pageId.startsWith('mock_') || !encryptedToken) {
      logger.info({}, 'meta_adapter.facebook.mock_dispatch_successful');
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
      logger.error({ err: e.message }, 'meta_adapter.facebook.failed');
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
    logger.info({ recipientId }, 'meta_adapter.instagram.dispatching');

    const instagramId = this.credentials?.instagram_id || '';
    const encryptedToken = this.credentials?.page_access_token_encrypted || '';

    if (instagramId.startsWith('mock_') || !encryptedToken) {
      logger.info({}, 'meta_adapter.instagram.mock_dispatch_successful');
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
      logger.error({ err: e.message }, 'meta_adapter.instagram.failed');
      return { success: false, error: e.message };
    }
  }

  /**
   * Fetches a PSID's real name/photo via the Messenger User Profile API. Requires the
   * "Business Asset User Profile Access" feature to have Advanced Access — at Standard
   * Access, Meta returns an empty object rather than an error, which this treats as a
   * fetch failure (caller falls back to the "Facebook User {id}" placeholder).
   */
  async fetchFacebookProfile(
    psid: string
  ): Promise<{ success: boolean; firstName?: string; lastName?: string; profilePicUrl?: string; error?: string }> {
    const encryptedToken = this.credentials?.page_access_token_encrypted || '';
    if (!encryptedToken || psid.startsWith('mock_')) {
      return { success: false, error: 'no_page_access_token' };
    }

    try {
      const pageAccessToken = decrypt(encryptedToken);
      const url = `https://graph.facebook.com/v18.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || `HTTP ${response.status}` };
      }
      if (!data.first_name && !data.last_name && !data.profile_pic) {
        // Empty object: most commonly the app lacks Advanced Access for
        // Business Asset User Profile Access, not an actual API error.
        return { success: false, error: 'empty_profile_response' };
      }

      return { success: true, firstName: data.first_name, lastName: data.last_name, profilePicUrl: data.profile_pic };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Fetches an IGSID's real name/photo via the Instagram Messaging User Profile API.
   * Unlike the Messenger equivalent, Meta's docs don't gate this behind a separate
   * Advanced Access feature — it rides on instagram_manage_messages, which this app
   * already has since it's receiving live IG DM webhooks.
   */
  async fetchInstagramProfile(
    igsid: string
  ): Promise<{ success: boolean; name?: string; profilePicUrl?: string; error?: string }> {
    const encryptedToken = this.credentials?.page_access_token_encrypted || '';
    if (!encryptedToken || igsid.startsWith('mock_')) {
      return { success: false, error: 'no_page_access_token' };
    }

    try {
      const pageAccessToken = decrypt(encryptedToken);
      const url = `https://graph.facebook.com/v18.0/${igsid}?fields=name,profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || `HTTP ${response.status}` };
      }
      if (!data.name && !data.profile_pic) {
        return { success: false, error: 'empty_profile_response' };
      }

      return { success: true, name: data.name, profilePicUrl: data.profile_pic };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async sendWhatsApp(
    to: string,
    text: string,
    audioUrl?: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    logger.info({ to }, 'meta_adapter.whatsapp.dispatching');

    const phoneNumberId = this.credentials?.phone_number_id || '';
    const encryptedToken = this.credentials?.access_token_encrypted || this.credentials?.system_user_access_token_encrypted || '';

    if (phoneNumberId.startsWith('mock_') || !encryptedToken) {
      logger.info({}, 'meta_adapter.whatsapp.mock_dispatch_successful');
      return { success: true, externalId: `mock_wa_out_${Date.now()}` };
    }

    try {
      const systemToken = decrypt(encryptedToken);
      const cleanTo = to.replace('+', '').trim();

      let textResId = '';
      if (text) {
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
        textResId = data.messages?.[0]?.id;
      }

      if (audioUrl) {
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
            type: 'audio',
            audio: { link: audioUrl }
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed WhatsApp audio request');
        }
        return { success: true, externalId: data.messages?.[0]?.id || textResId };
      }

      return { success: true, externalId: textResId };
    } catch (e: any) {
      logger.error({ err: e.message }, 'meta_adapter.whatsapp.failed');
      return { success: false, error: e.message };
    }
  }

  /**
   * Sends a pre-approved WhatsApp template message (message type "template"),
   * the only way to business-initiate a message to a contact outside the 24h
   * customer-service session window. Structurally distinct from sendWhatsApp's
   * free-text "text" message type — templateName/languageCode must match a
   * template already submitted to and approved by Meta in WhatsApp Manager;
   * there is no self-serve instant-approval path, so this assumes the caller
   * is passing an already-approved name (see listApprovedWhatsAppTemplates in
   * whatsapp_broadcast.ts, which fetches the real approved set from the Graph
   * API rather than trusting free-typed template names).
   */
  async sendWhatsAppTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    bodyParams?: string[]
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    logger.info({ to, templateName, languageCode }, 'meta_adapter.whatsapp_template.dispatching');

    const phoneNumberId = this.credentials?.phone_number_id || '';
    const encryptedToken = this.credentials?.access_token_encrypted || this.credentials?.system_user_access_token_encrypted || '';

    if (phoneNumberId.startsWith('mock_') || !encryptedToken) {
      logger.info({}, 'meta_adapter.whatsapp_template.mock_dispatch_successful');
      return { success: true, externalId: `mock_wa_template_out_${Date.now()}` };
    }

    try {
      const systemToken = decrypt(encryptedToken);
      const cleanTo = to.replace('+', '').trim();

      const components = bodyParams && bodyParams.length > 0
        ? [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }]
        : [];

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
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components.length > 0 ? { components } : {})
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed WhatsApp template request');
      }

      return { success: true, externalId: data.messages?.[0]?.id };
    } catch (e: any) {
      logger.error({ err: e.message, templateName }, 'meta_adapter.whatsapp_template.failed');
      return { success: false, error: e.message };
    }
  }
}
