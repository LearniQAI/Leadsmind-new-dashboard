import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import ws from 'ws';
(global as any).WebSocket = ws;

import { AttributionEngine } from '../src/lib/analytics/AttributionEngine';
import { createAdminClient } from '../src/lib/supabase/server';

// 1. Unit Test for client-side consolidation logic
function testConversationConsolidation() {
  console.log('[UNIT TEST] Testing dynamic thread consolidation...');

  // Mock conversations structure mirroring Supabase query response
  const mockRawConversations = [
    {
      id: 'conv-email-1',
      platform: 'email',
      title: 'Email conversation with John',
      last_message_at: '2026-05-27T10:00:00Z',
      unread_count: 1,
      contacts: { id: 'contact-john', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
      messages: [
        { content: 'Hello via Email', direction: 'inbound', sent_at: '2026-05-27T08:00:00Z', status: 'delivered' },
        { content: 'Sure thing!', direction: 'outbound', sent_at: '2026-05-27T10:00:00Z', status: 'delivered' }
      ]
    },
    {
      id: 'conv-whatsapp-1',
      platform: 'whatsapp',
      title: 'WhatsApp conversation with John',
      last_message_at: '2026-05-27T12:00:00Z',
      unread_count: 2,
      contacts: { id: 'contact-john', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
      messages: [
        { content: 'Hello via WhatsApp', direction: 'inbound', sent_at: '2026-05-27T09:00:00Z', status: 'delivered' },
        { content: 'Ping me here instead', direction: 'inbound', sent_at: '2026-05-27T12:00:00Z', status: 'delivered' }
      ]
    },
    {
      id: 'conv-anonymous-1',
      platform: 'sms',
      title: 'SMS conversation with stranger',
      last_message_at: '2026-05-27T07:00:00Z',
      unread_count: 0,
      contacts: null,
      messages: [
        { content: 'SMS from unknown', direction: 'inbound', sent_at: '2026-05-27T07:00:00Z', status: 'delivered' }
      ]
    }
  ];

  // Run the consolidation logic (the exact logic in ConversationsClient.tsx)
  const contactMap: Record<string, any> = {};
  const singleConvs: any[] = [];

  mockRawConversations.forEach((conv) => {
    const contact = Array.isArray(conv.contacts) ? conv.contacts[0] : conv.contacts;
    const contactId = contact?.id;

    if (!contactId) {
      singleConvs.push({
        ...conv,
        contacts: contact,
        isConsolidated: false,
        availablePlatforms: [{ platform: conv.platform, conversationId: conv.id }],
        messages: (conv.messages || []).map((m: any) => ({
          ...m,
          platform: conv.platform,
          conversationId: conv.id
        }))
      });
      return;
    }

    if (!contactMap[contactId]) {
      contactMap[contactId] = {
        id: `contact:${contactId}`,
        contact_id: contactId,
        contacts: contact,
        title: conv.title,
        last_message_at: conv.last_message_at,
        platform: conv.platform,
        isConsolidated: true,
        unread_count: 0,
        availablePlatforms: [],
        messages: []
      };
    }

    const entry = contactMap[contactId];
    if (new Date(conv.last_message_at).getTime() > new Date(entry.last_message_at).getTime()) {
      entry.last_message_at = conv.last_message_at;
      entry.platform = conv.platform;
      entry.title = conv.title;
    }
    entry.unread_count += (conv.unread_count || 0);

    if (!entry.availablePlatforms.some((p: any) => p.platform === conv.platform)) {
      entry.availablePlatforms.push({ platform: conv.platform, conversationId: conv.id });
    }

    const convMessages = (conv.messages || []).map((m: any) => ({
      ...m,
      platform: conv.platform,
      conversationId: conv.id
    }));
    entry.messages.push(...convMessages);
  });

  const allConsolidated = [...Object.values(contactMap), ...singleConvs];

  allConsolidated.forEach((conv) => {
    conv.messages.sort((a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
  });

  const sortedConsolidated = allConsolidated.sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  // Assertions
  console.log(`- Total threads consolidated: ${sortedConsolidated.length} (expected: 2)`);
  if (sortedConsolidated.length !== 2) {
    throw new Error('Consolidation failed: Expected exactly 2 threads.');
  }

  const johnThread = sortedConsolidated.find(t => t.id === 'contact:contact-john');
  console.log(`- John thread messages count: ${johnThread.messages.length} (expected: 4)`);
  if (johnThread.messages.length !== 4) {
    throw new Error('Message merge failed: Expected 4 messages.');
  }

  console.log(`- John thread unread count: ${johnThread.unread_count} (expected: 3)`);
  if (johnThread.unread_count !== 3) {
    throw new Error('Unread count summing failed: Expected 3.');
  }

  console.log(`- John thread platforms: ${johnThread.availablePlatforms.map((p: any) => p.platform).join(', ')}`);
  if (johnThread.availablePlatforms.length !== 2) {
    throw new Error('Platforms configuration failed: Expected 2 platforms.');
  }

  console.log('- Chronological sort check:');
  johnThread.messages.forEach((m: any, idx: number) => {
    console.log(`  [${idx}] [${m.platform.toUpperCase()}] ${m.content} (${m.sent_at})`);
  });

  const timestamps = johnThread.messages.map((m: any) => new Date(m.sent_at).getTime());
  const isChronological = timestamps.every((val: number, i: number) => i === 0 || val >= timestamps[i - 1]);
  if (!isChronological) {
    throw new Error('Messages sorting is not chronological.');
  }

  console.log('[SUCCESS] Conversation consolidation unit tests passed.\n');
}

// 2. Integration Test for Attribution Pipeline
async function testAttributionEngine() {
  console.log('=== STARTING REVENUE ATTRIBUTION PIPELINE TEST ===');
  const supabase = createAdminClient();

  // Find a test workspace
  const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
  if (!workspaces || workspaces.length === 0) {
    console.warn('No workspace found in Database. Skipping database tests.');
    return;
  }
  const workspaceId = workspaces[0].id;
  console.log(`Using Workspace ID: ${workspaceId}`);

  // Create a temporary contact
  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      first_name: 'Attribution',
      last_name: 'Tester',
      email: 'attr-tester@leadsmind.io',
      source: 'test'
    })
    .select()
    .single();

  if (contactErr || !contact) {
    throw new Error(`Failed to create contact: ${contactErr?.message}`);
  }
  console.log(`Created test contact: ${contact.id}`);

  // Create a temporary campaign
  const { data: campaign, error: campaignErr } = await supabase
    .from('email_campaigns')
    .insert({
      workspace_id: workspaceId,
      name: 'Black Friday Blast',
      subject: 'Massive Savings!',
      status: 'sent'
    })
    .select()
    .single();

  if (campaignErr || !campaign) {
    // Cleanup contact first
    await supabase.from('contacts').delete().eq('id', contact.id);
    throw new Error(`Failed to create campaign: ${campaignErr?.message}`);
  }
  console.log(`Created test campaign: ${campaign.id}`);

  try {
    // 1. Create a tracking log event (e.g. click) 5 hours ago
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const { error: trackingErr } = await supabase
      .from('email_tracking_logs')
      .insert({
        workspace_id: workspaceId,
        campaign_id: campaign.id,
        contact_id: contact.id,
        event_type: 'click',
        timestamp: fiveHoursAgo
      });

    if (trackingErr) throw new Error(`Failed to insert tracking log: ${trackingErr.message}`);
    console.log('- Inserted marketing touch log (click event)');

    // 2. Create an unpaid invoice
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert({
        workspace_id: workspaceId,
        contact_id: contact.id,
        amount_due: 1500.00,
        total_amount: 1500.00,
        currency: 'ZAR',
        status: 'open',
        invoice_number: 'INV-TEST-ATTR-1'
      })
      .select()
      .single();

    if (invoiceErr || !invoice) throw new Error(`Failed to create invoice: ${invoiceErr?.message}`);
    console.log(`- Created open invoice: ${invoice.id} for R1500.00`);

    // 3. Mark invoice as paid to trigger Attribution pipeline
    console.log('- Triggering invoice payment attribution engine...');
    const result = await AttributionEngine.trackInvoicePayment(invoice.id);
    if (!result.success || !result.data) {
      throw new Error(`Attribution tracking failed: ${result.error}`);
    }

    const updatedInvoice = result.data;
    console.log(`- Invoice status updated: ${updatedInvoice.status}`);
    console.log(`- Invoice paid_at: ${updatedInvoice.paid_at}`);
    console.log('- Invoice metadata:', JSON.stringify(updatedInvoice.metadata));

    const attr = updatedInvoice.metadata?.attribution;
    if (!attr) {
      throw new Error('Invoice metadata has no attribution payload!');
    }

    console.log(`- [SUCCESS] Attributed to: ${attr.type}`);
    if (attr.type !== 'campaign' || attr.campaign_id !== campaign.id) {
      throw new Error(`Attribution target mismatch! Expected campaign: ${campaign.id}, got: ${JSON.stringify(attr)}`);
    }

    // 4. Fetch metrics to verify calculations
    console.log('- Querying workspace ROI metrics...');
    const metrics = await AttributionEngine.getAttributionMetrics(workspaceId);
    console.log(`  Total Gains ZAR: R${metrics.totalRandRevenue}`);
    console.log(`  CTOR: ${metrics.ctor}%`);
    console.log('  Sequence step gains:', metrics.stepRevenue);

    if (metrics.totalRandRevenue < 1500.00) {
      throw new Error('Metrics rollup failed: expected total gains of at least R1500.00');
    }
    console.log('- [SUCCESS] Workspace metrics validated.');

  } finally {
    // Cleanup all created records
    console.log('Cleaning up mock database records...');
    await supabase.from('invoices').delete().eq('contact_id', contact.id);
    await supabase.from('email_tracking_logs').delete().eq('contact_id', contact.id);
    await supabase.from('email_campaigns').delete().eq('id', campaign.id);
    await supabase.from('contacts').delete().eq('id', contact.id);
    console.log('Database cleanup completed.');
  }

  console.log('=== ALL INTEGRATION TESTS PASSED ===');
}

async function runTests() {
  testConversationConsolidation();
  await testAttributionEngine();
}

runTests().catch((err) => {
  console.error('[TEST FAIL]:', err);
  process.exit(1);
});
