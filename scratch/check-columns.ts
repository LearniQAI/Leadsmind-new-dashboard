import { createAdminClient } from '../src/lib/supabase/server'

async function checkColumns() {
  const supabase = createAdminClient()
  const tables = ['products', 'orders', 'pipelines', 'pipeline_stages', 'appointments', 'forms', 'tasks']

  for (const table of tables) {
    console.log(`\n--- COLUMNS FOR TABLE: ${table} ---`)
    const { data: cols, error } = await supabase
      .from('information_schema_columns' as any)
      .select('column_name, data_type, is_nullable')
      .eq('table_name', table)
      .eq('table_schema', 'public')

    if (error) {
      // If direct information_schema queries are blocked, let's try calling pg_catalog via RPC or another way
      // But typically we can just execute SQL or query. Let's see if we can get columns.
      console.error(`Error for ${table}:`, error.message)
    } else if (cols) {
      console.log(cols.map((c: any) => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`))
    }
  }
}

checkColumns()
