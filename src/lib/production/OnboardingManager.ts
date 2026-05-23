import { createServerClient } from '@/lib/supabase/server';

export class OnboardingManager {
  /**
   * Retrieves the current user's onboarding state across modules.
   */
  public static async getOnboardingState(workspaceId: string, userId: string) {
    const supabase = await createServerClient();
    
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    return progress || [];
  }

  /**
   * Marks a specific onboarding module as complete.
   */
  public static async markModuleComplete(workspaceId: string, userId: string, module: string) {
    const supabase = await createServerClient();
    
    // Upsert completion state
    const { data: existing } = await supabase
      .from('onboarding_progress')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('module', module)
      .maybeSingle();

    if (existing) {
      await supabase.from('onboarding_progress').update({ 
        is_completed: true, 
        completed_at: new Date().toISOString() 
      }).eq('id', existing.id);
    } else {
      await supabase.from('onboarding_progress').insert({
        workspace_id: workspaceId,
        user_id: userId,
        module,
        is_completed: true,
        completed_at: new Date().toISOString()
      });
    }
  }
}
