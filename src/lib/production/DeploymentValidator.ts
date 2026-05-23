import { createServerClient } from '@/lib/supabase/server';

export class DeploymentValidator {
  /**
   * Intended to be run during CI/CD or post-deploy webhook.
   * Validates database migrations and critical environment variables.
   */
  public static async validateEnvironment(version: string) {
    const supabase = await createServerClient();
    
    const logs = [];
    let passed = true;

    // 1. Check Env Vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logs.push('[FAIL] Missing core Supabase variables.');
      passed = false;
    } else {
      logs.push('[PASS] Supabase variables present.');
    }

    // 2. Check Database Schema Presence (Spot Check Core Tables)
    try {
      await supabase.from('workspaces').select('id').limit(1);
      await supabase.from('crm_opportunities').select('id').limit(1);
      await supabase.from('automation_workflows').select('id').limit(1);
      logs.push('[PASS] Core schema accessible.');
    } catch (e: any) {
      logs.push(`[FAIL] Database schema validation failed: ${e.message}`);
      passed = false;
    }

    // 3. Log the validation result
    await supabase.from('deployment_validations').insert({
      deployment_version: version,
      validation_type: 'post_deploy',
      passed,
      logs
    });

    return { passed, logs };
  }
}
