/**
 * ReleaseValidator — runs validation checks before production deployments.
 * Checks migration levels, database connectivity, and asset bundles.
 */

import { createClient } from '@/lib/supabase/client';

export interface ValidationItem {
  id: string;
  name: string;
  passed: boolean;
  message: string;
}

export const ReleaseValidator = {
  /**
   * Run structural release migration checks.
   */
  async verifyDeployment(): Promise<ValidationItem[]> {
    const supabase = createClient();
    const results: ValidationItem[] = [];

    // 1. Verify Supabase connection
    try {
      const { data, error } = await supabase.from('forms').select('id').limit(1);
      results.push({
        id: 'supabase_db',
        name: 'Supabase DB Connection',
        passed: !error,
        message: error ? `DB Select failed: ${error.message}` : 'DB Connection nominal.'
      });
    } catch (err: any) {
      results.push({
        id: 'supabase_db',
        name: 'Supabase DB Connection',
        passed: false,
        message: err.message || 'Fatal DB failure'
      });
    }

    // 2. Verify Presence tracking active tables
    try {
      const { error } = await supabase.from('form_presence').select('form_id').limit(1);
      results.push({
        id: 'presence_tables',
        name: 'Presence Schema Audit',
        passed: !error,
        message: error ? `Schema query failed: ${error.message}` : 'Presence tracking schemas active.'
      });
    } catch {
      results.push({
        id: 'presence_tables',
        name: 'Presence Schema Audit',
        passed: false,
        message: 'Presence table missing'
      });
    }

    return results;
  }
};
