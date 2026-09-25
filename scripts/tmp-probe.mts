import { config } from 'dotenv';
config({ path: '.env.local' });
import { Resend } from 'resend';
const r: any = new Resend(process.env.RESEND_API_KEY!);
const WH = '7574879c-31cf-45c3-af68-91c105edb93b';
const sent = await r.emails.send({ from: 'LeadsMind Webhook Check <noreply@leadsmind.io>', to: 'delivered@resend.dev', subject: 'webhook e2e check', text: 'Platform webhook delivery check.' });
if (sent.error) { console.log('send error', sent.error); process.exit(0); }
const id = sent.data.id; console.log('sent email_id', id);
const deadline = Date.now() + 120_000;
const seen = new Map<string, any>();
while (Date.now() < deadline) {
  await new Promise((res) => setTimeout(res, 8000));
  const ev = await r.webhooks.events.list({ webhookId: WH, limit: 40 });
  if (ev.error) { console.log('events.list error', ev.error.name, ev.error.message); break; }
  for (const e of ev.data.data) {
    if (seen.has(e.id) || !String(e.type).startsWith('email.') || e.type === 'email.received') continue;
    const g = await r.webhooks.events.get({ webhookId: WH, eventId: e.id });
    if (g.data?.payload?.data?.email_id !== id) continue;
    const at = await r.webhooks.events.attempts.list({ webhookId: WH, eventId: e.id });
    seen.set(e.id, { type: e.type, status: e.status, attempts: (at.data?.data ?? []).map((a: any) => `${a.http_status_code} ${String(a.response).slice(0, 120)}`) });
  }
  const types = [...seen.values()].map((v) => v.type);
  if (types.includes('email.sent') && types.includes('email.delivered')) break;
}
for (const [eid, v] of seen) console.log(eid, v.type, v.status, JSON.stringify(v.attempts));
if (!seen.size) console.log('no webhook events found for this email yet');
setTimeout(() => process.exit(0), 200);
