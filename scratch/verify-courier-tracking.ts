import { createAdminClient } from '../src/lib/supabase/server'
import { createShipment } from '../src/app/actions/shipments'
import { updateInvoiceStatus } from '../src/app/actions/finance'

async function runTests() {
  const supabase = createAdminClient()

  console.log('--- STARTING COURIER TRACKING VERIFICATION TESTS ---')

  // 1. Fetch or create a test workspace
  const { data: workspaces, error: wsErr } = await supabase
    .from('workspaces')
    .select('*')
    .limit(1)

  if (wsErr || !workspaces || workspaces.length === 0) {
    console.error('No workspaces found to run tests. Exiting.')
    return
  }

  const workspace = workspaces[0]
  const workspaceId = workspace.id
  console.log(`Using Workspace: ${workspace.name} (${workspaceId})`)

  // Ensure workspace plan_tier is 'free'
  await supabase
    .from('workspaces')
    .update({ plan_tier: 'free' })
    .eq('id', workspaceId)

  // Reset/Delete existing tracking quota for clean run
  await supabase
    .from('tracking_quota')
    .delete()
    .eq('workspace_id', workspaceId)

  // 2. Test Quota checking for Free/Spark (Limit 3)
  console.log('\n--- 1. Testing Spark/Free Quota Gate (Limit: 3) ---')
  
  // Register 1st shipment (used_count 0 -> 1)
  const res1 = await createShipment(workspaceId, { tracking_number: 'TEST-TRACK-001' })
  console.log('Shipment 1 Registration:', res1.success ? 'SUCCESS' : 'FAILED', res1.error || '')

  // Register 2nd shipment (used_count 1 -> 2)
  const res2 = await createShipment(workspaceId, { tracking_number: 'TEST-TRACK-002' })
  console.log('Shipment 2 Registration:', res2.success ? 'SUCCESS' : 'FAILED', res2.error || '')

  // Register 3rd shipment (used_count 2 -> 3)
  const res3 = await createShipment(workspaceId, { tracking_number: 'TEST-TRACK-003' })
  console.log('Shipment 3 Registration:', res3.success ? 'SUCCESS' : 'FAILED', res3.error || '')

  // Register 4th shipment (used_count 3 -> should trigger the Spark one-time test_used bypass)
  const res4 = await createShipment(workspaceId, { tracking_number: 'TEST-TRACK-004' })
  console.log('Shipment 4 Registration (Should bypass via test_used override):', res4.success ? 'SUCCESS' : 'FAILED', res4.error || '')

  // Register 5th shipment (used_count 4 -> should fail because test_used is already set)
  const res5 = await createShipment(workspaceId, { tracking_number: 'TEST-TRACK-005' })
  console.log('Shipment 5 Registration (Should FAIL due to quota):', res5.success ? 'SUCCESS (Unexpected)' : `FAILED (Expected: ${res5.error})`)

  // Inspect the current quota row
  const { data: quota } = await supabase
    .from('tracking_quota')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  console.log('Current Quota Row state:', quota)

  // 3. Test Auto-registration on Invoice Payment
  console.log('\n--- 2. Testing Automatic Shipment on Paid Invoice ---')

  // Find or create a test contact
  let { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .limit(1)

  let contact = contacts?.[0]
  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        first_name: 'John',
        last_name: 'Recipient',
        email: 'john.recipient@example.com'
      })
      .select('*')
      .single()
    contact = newContact
  }

  // Create a mock invoice with shipping address in metadata
  const invoiceNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`
  const { data: invoice, error: invInsErr } = await supabase
    .from('invoices')
    .insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      invoice_number: invoiceNum,
      total_amount: 150.00,
      amount_due: 150.00,
      amount_paid: 0.00,
      status: 'draft',
      metadata: {
        shipping_address: '123 Delivery Road, Cape Town, 8001, South Africa'
      }
    })
    .select('*')
    .single()

  if (invInsErr || !invoice) {
    console.error('Failed to create test invoice:', invInsErr)
    return
  }

  console.log(`Created mock Invoice ${invoice.invoice_number} with shipping address.`)

  // Temporarily promote workspace to growth tier so it doesn't fail quota check on this auto-shipment
  await supabase
    .from('workspaces')
    .update({ plan_tier: 'growth' })
    .eq('id', workspaceId)

  // Update tracking quota tier to growth
  await supabase
    .from('tracking_quota')
    .update({ plan_tier: 'growth', used_count: 0 })
    .eq('workspace_id', workspaceId)

  console.log('Marking invoice as paid...')
  const payRes = await updateInvoiceStatus(invoice.id, 'paid')
  console.log('Invoice status update status:', payRes.success ? 'SUCCESS' : 'FAILED', payRes.error || '')

  // Query courier_shipments to see if a shipment was created automatically
  const expectedTracking = `LM-INV-${invoice.invoice_number}`
  const { data: autoShipment } = await supabase
    .from('courier_shipments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('tracking_number', expectedTracking)
    .maybeSingle()

  if (autoShipment) {
    console.log('SUCCESS: Auto-registered shipment found!')
    console.log('Auto Shipment details:', {
      id: autoShipment.id,
      tracking_number: autoShipment.tracking_number,
      source: autoShipment.source,
      source_id: autoShipment.source_id,
      recipient_email: autoShipment.recipient_email,
      recipient_name: autoShipment.recipient_name
    })
  } else {
    console.error('FAILED: No auto-registered shipment found for tracking number:', expectedTracking)
  }

  // Cleanup test data
  console.log('\n--- Cleanup Test Data ---')
  if (autoShipment) {
    await supabase.from('courier_shipments').delete().eq('id', autoShipment.id)
  }
  await supabase.from('invoices').delete().eq('id', invoice.id)
  await supabase.from('tracking_quota').delete().eq('workspace_id', workspaceId)
  
  // Restore workspace plan tier to original
  await supabase
    .from('workspaces')
    .update({ plan_tier: workspace.plan_tier })
    .eq('id', workspaceId)

  console.log('--- ALL TESTS COMPLETED ---')
}

runTests()
