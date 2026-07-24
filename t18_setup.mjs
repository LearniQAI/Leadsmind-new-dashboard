import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TS = Date.now();
const EMAIL = `t18-refund-tester-${TS}@example.com`;
const PASSWORD = 'T18-refund-test-pw-!23456';

// Use two real, pre-existing (dev/test) workspaces so we don't have to fabricate one.
const WS_ADMIN = '5117335a-d453-4796-90ff-f5ac00a9dd95'; // "Olu Max's Workspace" — tester will be admin here
const WS_MEMBER = 'b83f0966-837e-4952-9cd4-480be4ca3f16'; // "zain ul hassssssan's Workspace" — tester will be non-admin member here

// 1. Create temp auth user
const { data: userRes, error: userErr } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});
if (userErr) { console.error('createUser failed', userErr); process.exit(1); }
const userId = userRes.user.id;
console.log('Created temp user:', userId, EMAIL);

// 2. Membership rows
const { error: mErr1 } = await supabase.from('workspace_members').insert({ workspace_id: WS_ADMIN, user_id: userId, role: 'admin' });
if (mErr1) { console.error('admin membership insert failed', mErr1); process.exit(1); }
const { error: mErr2 } = await supabase.from('workspace_members').insert({ workspace_id: WS_MEMBER, user_id: userId, role: 'member' });
if (mErr2) { console.error('member membership insert failed', mErr2); process.exit(1); }
console.log('Memberships created: admin in', WS_ADMIN, ', member in', WS_MEMBER);

// 3. Seed test contact in WS_ADMIN
const { data: contact, error: cErr } = await supabase.from('contacts').insert({
  workspace_id: WS_ADMIN, first_name: 'T18', last_name: 'Refundee', email: `t18-contact-${TS}@example.com`, source: 'test',
}).select('id').single();
if (cErr) { console.error('contact insert failed', cErr); process.exit(1); }
console.log('Test contact:', contact.id);

// 4a. Seed a PAID invoice WITH a fake-but-well-formed stripe_payment_intent_id (real Stripe path test)
const { data: invStripe, error: invStripeErr } = await supabase.from('invoices').insert({
  workspace_id: WS_ADMIN, contact_id: contact.id, amount_due: 500, amount_paid: 500, total_amount: 500,
  subtotal: 500, tax_total: 0, discount_total: 0, currency: 'USD', status: 'paid',
  invoice_number: `T18-STRIPE-${TS}`, stripe_payment_intent_id: `pi_3T18test${TS}`,
}).select('id').single();
if (invStripeErr) { console.error('stripe invoice insert failed', invStripeErr); process.exit(1); }
console.log('Test Stripe-path invoice:', invStripe.id);

// 4b. Seed a PAID invoice with NO payment_intent (historical / PayFast-style — record-only path test)
const { data: invHistorical, error: invHistErr } = await supabase.from('invoices').insert({
  workspace_id: WS_ADMIN, contact_id: contact.id, amount_due: 250, amount_paid: 250, total_amount: 250,
  subtotal: 250, tax_total: 0, discount_total: 0, currency: 'ZAR', status: 'paid',
  invoice_number: `T18-HIST-${TS}`, stripe_payment_intent_id: null,
}).select('id').single();
if (invHistErr) { console.error('historical invoice insert failed', invHistErr); process.exit(1); }
console.log('Test historical/record-only invoice:', invHistorical.id);

// 5. Seed a paid course + enrollment (no payment_intent — record-only enrollment path)
const { data: course, error: courseErr } = await supabase.from('courses').insert({
  workspace_id: WS_ADMIN, title: `T18 Test Course ${TS}`, price: 99, published: true,
}).select('id').single();
if (courseErr) { console.error('course insert failed', courseErr); process.exit(1); }

const { data: enrollment, error: enrErr } = await supabase.from('enrollments').insert({
  course_id: course.id, contact_id: contact.id, status: 'active', payment_status: 'paid', stripe_payment_intent_id: null,
}).select('id').single();
if (enrErr) { console.error('enrollment insert failed', enrErr); process.exit(1); }
console.log('Test course:', course.id, 'enrollment:', enrollment.id);

// 6. Seed a confirmed booking_lease + appointment + linked invoice (booking refund test)
const { data: calendar, error: calErr } = await supabase.from('booking_calendars').insert({
  workspace_id: WS_ADMIN, name: `T18 Test Calendar ${TS}`, slot_duration: 30,
}).select('id').single();
if (calErr) { console.error('calendar insert failed', calErr); process.exit(1); }

const slotTime = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const { data: lease, error: leaseErr } = await supabase.from('booking_leases').insert({
  workspace_id: WS_ADMIN, calendar_id: calendar.id, slot_time: slotTime,
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), status: 'confirmed', contact_id: contact.id,
}).select('id').single();
if (leaseErr) { console.error('lease insert failed', leaseErr); process.exit(1); }

const { data: appointment, error: apptErr } = await supabase.from('appointments').insert({
  workspace_id: WS_ADMIN, calendar_id: calendar.id, contact_id: contact.id,
  title: 'T18 Test Paid Meeting', start_time: slotTime, end_time: new Date(Date.parse(slotTime) + 30 * 60000).toISOString(),
  status: 'scheduled', metadata: { lease_id: lease.id },
}).select('id').single();
if (apptErr) { console.error('appointment insert failed', apptErr); process.exit(1); }

const { data: invBooking, error: invBookingErr } = await supabase.from('invoices').insert({
  workspace_id: WS_ADMIN, contact_id: contact.id, amount_due: 150, amount_paid: 150, total_amount: 150,
  subtotal: 150, tax_total: 0, discount_total: 0, currency: 'ZAR', status: 'paid',
  invoice_number: `T18-BOOKING-${TS}`, metadata: { lease_id: lease.id },
}).select('id').single();
if (invBookingErr) { console.error('booking invoice insert failed', invBookingErr); process.exit(1); }
console.log('Test booking lease:', lease.id, 'appointment:', appointment.id, 'invoice:', invBooking.id);

// Persist all created ids for later steps + cleanup
fs.writeFileSync('t18_ids.json', JSON.stringify({
  TS, EMAIL, PASSWORD, userId, WS_ADMIN, WS_MEMBER, contactId: contact.id,
  invStripeId: invStripe.id, invHistoricalId: invHistorical.id,
  courseId: course.id, enrollmentId: enrollment.id,
  calendarId: calendar.id, leaseId: lease.id, appointmentId: appointment.id, invBookingId: invBooking.id,
}, null, 2));

console.log('\nSetup complete. IDs written to t18_ids.json');
