export async function sendSMS({ to, message, mediaUrl, config }: { to: string, message: string, mediaUrl?: string, config?: { accountSid?: string | null, authToken?: string | null, fromNumber?: string | null } }) {
 const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID;
 const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN;
 const apiKey = process.env.TWILIO_API_KEY;
 const apiSecret = process.env.TWILIO_API_SECRET;
 const fromNumber = config?.fromNumber || process.env.TWILIO_PHONE_NUMBER;

 if (!accountSid || (!authToken && !apiKey) || !fromNumber || accountSid === 'AC_123') {
  console.log('--- SMS/WhatsApp SANDBOX MODE ---');
  console.log(`To: ${to}`);
  console.log(`Message: ${message}`);
  if (mediaUrl) {
    console.log(`Media URL: ${mediaUrl}`);
  }
  console.log('-------------------------');
  return { sid: 'mock_sms_id_' + Date.now() };
 }

 const twilio = require('twilio');
 let client;
 if (apiKey && apiSecret) {
   client = twilio(apiKey, apiSecret, { accountSid });
 } else {
   client = twilio(accountSid, authToken);
 }
 
 try {
  const options: any = { body: message, from: fromNumber, to };
  if (mediaUrl) {
    options.mediaUrl = [mediaUrl];
  }
  const result = await client.messages.create(options);
  return { sid: result.sid };
 } catch (error) {
  console.error('Twilio error:', error);
  throw error;
 }
}
