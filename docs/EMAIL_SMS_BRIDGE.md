# Email ↔ SMS Bridge Documentation

## Overview
The Email ↔ SMS Bridge is a bidirectional relay that allows seamless communication between an Email client and an SMS client. 

1. **Inbound Email:** Customers send emails to a designated `sms.leadsmind.io` proxy address. Resend catches the email and forwards it to our Vercel Webhook. We parse the email, strip signatures, and use Twilio to text the user.
2. **Outbound SMS (Reply):** The user receives the text and replies directly from their native SMS app. Twilio catches the reply and forwards it to our Twilio Webhook. We look up the original email sender in the CRM and use Resend to send an outbound email reply back to the customer.

## Environment Variables Required
The following environment variables MUST be present in the Vercel production environment:

- `RESEND_API_KEY`: API Key for fetching inbound email bodies and sending outbound email replies.
- `RESEND_WEBHOOK_SECRET`: Used to cryptographically verify that inbound webhooks are legitimately from Resend (Svix verification).
- `RESEND_FROM_EMAIL`: The default fallback email address used when sending replies (e.g., `notifications@leadsmind.io`).
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID.
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token.
- `TWILIO_PHONE_NUMBER`: The active Twilio Phone Number you purchased.

**Critical Note on Twilio API Keys:** If `TWILIO_API_KEY` and `TWILIO_API_SECRET` are set in the environment, the Twilio SDK will prioritize them over the Auth Token. Ensure these are either valid or completely removed.

## Twilio Setup Requirements
1. **Phone Number:** Purchase a Twilio Phone Number with SMS capabilities.
2. **Webhook Configuration:** 
   - Go to Phone Numbers -> Manage -> Active Numbers -> Click your number.
   - Under "Messaging Configuration", set "A message comes in" to:
     `Webhook` | `https://your-domain.com/api/webhooks/twilio/inbound` | `HTTP POST`
3. **A2P 10DLC (US Only):** If sending SMS to US numbers, you must complete A2P 10DLC registration in the Twilio Trust Hub, otherwise Twilio will block outbound texts with Error 30034.

## Resend Inbound Setup
1. **Domain Verification:** Ensure your domain (e.g., `leadsmind.io`) is verified in Resend for receiving.
2. **Webhook Configuration:**
   - Go to Webhooks in the Resend Dashboard.
   - Create a webhook for the `email.received` event.
   - Set the URL to: `https://your-domain.com/api/webhooks/resend/inbound`.
   - Copy the Signing Secret and set it as `RESEND_WEBHOOK_SECRET` in Vercel.
3. **DNS Records:** Ensure MX records for your receiving domain/subdomain point to Resend's inbound servers.

## Troubleshooting Notes
- **Empty SMS Body:** If texts arrive with only a Subject and no body, ensure your Vercel deployment is correctly calling `https://api.resend.com/emails/receiving/:id` via REST, as the Resend Node SDK currently has spotty support for the `/receiving` endpoint.
- **Error 20003 (Twilio):** This is an `Authenticate` error. Ensure your Auth Token is correct and that your Twilio account is funded and active. If your account balance hits $0 or is suspended, Twilio throws 20003.
- **Silent Failures:** If `TWILIO_PHONE_NUMBER` is missing from Vercel, the application gracefully degrades into "Sandbox Mode" (logging success locally but bypassing Twilio). Ensure the phone number environment variable is strictly populated.
