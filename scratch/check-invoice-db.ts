import { createAdminClient } from '../src/lib/supabase/server'

async function checkSchema() {
  const supabase = createAdminClient()
  
  console.log('--- Columns in public.invoices ---')
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('*')
    .limit(1)
  
  if (invErr) {
    console.error('Error fetching invoices:', invErr)
  } else if (invoices && invoices.length > 0) {
    console.log(Object.keys(invoices[0]))
  } else {
    console.log('No rows in invoices to inspect keys, running direct DDL query...')
    // Try mapping via rpc if possible or fallback
  }

  console.log('--- Columns in public.contacts ---')
  const { data: contacts, error: conErr } = await supabase
    .from('contacts')
    .select('*')
    .limit(1)

  if (conErr) {
    console.error('Error fetching contacts:', conErr)
  } else if (contacts && contacts.length > 0) {
    console.log(Object.keys(contacts[0]))
  }
}

checkSchema()
