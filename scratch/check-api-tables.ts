import { createAdminClient } from '../src/lib/supabase/server'

async function checkTables() {
  const supabase = createAdminClient()
  const tables = [
    'tasks',
    'products',
    'orders',
    'pipelines',
    'pipeline_stages',
    'appointments',
    'bookings',
    'calendar_bookings',
    'forms',
    'tags',
    'workspace_tags'
  ]

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`Table '${table}' -> ERROR: ${error.message} (code: ${error.code})`)
    } else {
      console.log(`Table '${table}' -> EXISTS. Columns:`, data.length > 0 ? Object.keys(data[0]) : '(empty table)')
    }
  }
}

checkTables()
