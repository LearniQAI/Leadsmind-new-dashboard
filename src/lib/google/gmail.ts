import { createServerClient } from '@/lib/supabase/server';
import { refreshGoogleToken } from './refreshToken';

/**
 * Service to interact with Gmail API using OAuth tokens.
 */
export async function getGmailService(workspaceId: string) {
  const supabase = await createServerClient();
  
  const { data: connection, error } = await supabase
    .from('platform_connections')
    .select('id, credentials')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'email')
    .single();

  if (error || !connection) {
    console.error(`[gmail-service] Connection not found for workspace ${workspaceId}:`, error);
    throw new Error('Gmail is not connected for this workspace');
  }

  console.log('[gmail-service] Found connection. Checking token status...');
  // Ensure token is fresh
  const accessToken = await refreshGoogleToken(connection.id, connection.credentials);
  console.log('[gmail-service] Token ready.');

  return {
    /**
     * Fetch threads from Gmail
     */
    async getThreads(maxResults = 10) {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return await response.json();
    },

    /**
     * Fetch a specific message/thread detail
     */
    async getMessage(messageId: string) {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return await response.json();
    },

    /**
     * Send an email via Gmail
     */
    async sendEmail(to: string, subject: string, body: string) {
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        body,
      ];
      const message = messageParts.join('\n');

      // The message needs to be base64url encoded
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      });

      return await response.json();
    }
  };
}
