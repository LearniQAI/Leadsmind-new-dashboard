// One reader for a WhatsApp platform_connections.credentials object.
//
// The canonical keys are the ones the Meta sign-in callback (api/auth/meta/callback) writes: waba_id, waba_name,
// phone_number. The manual/wizard connect paths in actions/messaging.ts used to write whatsapp_business_account_id,
// whatsapp_business_name and whatsapp_phone_number instead, and readers each picked one shape: the template
// picker read whatsapp_business_account_id, so for every real (sign-in) connection it called
// graph.facebook.com/v18.0//message_templates and failed. Writers now use the canonical keys; the legacy keys are
// still read as a fallback so a row saved the old way keeps working.
// Pure (no server imports): used by server actions and client components alike.

export interface WhatsAppCredentialFields {
  wabaId: string;
  businessName: string;
  phoneNumber: string;
}

export function readWhatsAppCredentials(credentials: any): WhatsAppCredentialFields {
  const c = credentials ?? {};
  return {
    wabaId: c.waba_id || c.whatsapp_business_account_id || '',
    businessName: c.waba_name || c.whatsapp_business_name || '',
    phoneNumber: c.phone_number || c.whatsapp_phone_number || '',
  };
}
