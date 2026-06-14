(global as any).WebSocket = class {};

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log("Checking columns on contacts...");
  const { data: contacts, error: contactsErr } = await supabase
    .from('contacts')
    .select('language, notification_preferences, deletion_requested, deletion_requested_at, last_login_at, last_reengagement_sent_at')
    .limit(1);
  if (contactsErr) console.log("Contacts Error:", contactsErr.message);
  else console.log("Contacts columns exist!");

  console.log("Checking columns on support_tickets...");
  const { data: support, error: supportErr } = await supabase
    .from('support_tickets')
    .select('category, csat_rating, csat_feedback')
    .limit(1);
  if (supportErr) console.log("Support Tickets Error:", supportErr.message);
  else console.log("Support Tickets columns exist!");

  console.log("Checking columns on workspace_branding...");
  const { data: branding, error: brandingErr } = await supabase
    .from('workspace_branding')
    .select('text_color, button_color, typography, custom_domain_ssl_status, favicon_url')
    .limit(1);
  if (brandingErr) console.log("Branding Error:", brandingErr.message);
  else console.log("Branding columns exist!");
}

check().catch(console.error);
