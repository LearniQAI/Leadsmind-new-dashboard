import { createServerClient } from '@/lib/supabase/server';

export class EntityResolutionEngine {
  /**
   * Attempts to find an existing contact by email or phone to prevent duplicates.
   * If found, returns the ID. If not, returns null.
   */
  public static async resolveContact(workspaceId: string, email?: string, phone?: string): Promise<string | null> {
    if (!email && !phone) return null;
    
    const supabase = await createServerClient();
    
    let query = supabase.from('crm_contacts').select('id').eq('workspace_id', workspaceId);
    
    if (email && phone) {
      query = query.or(`email.ilike.${email},phone.eq.${phone}`);
    } else if (email) {
      query = query.ilike('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data } = await query.limit(1).maybeSingle();
    return data ? data.id : null;
  }

  /**
   * Safe upsert for a contact. Uses resolution engine before creating.
   */
  public static async safeUpsertContact(workspaceId: string, contactData: any, ownerId: string | null = null) {
    const supabase = await createServerClient();
    const existingId = await this.resolveContact(workspaceId, contactData.email, contactData.phone);

    if (existingId) {
      // Update existing
      const { data, error } = await supabase
        .from('crm_contacts')
        .update({ ...contactData, updated_at: new Date().toISOString() })
        .eq('id', existingId)
        .select()
        .single();
      if (error) throw error;
      return { action: 'updated', contact: data };
    } else {
      // Create new
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({ workspace_id: workspaceId, owner_id: ownerId, ...contactData })
        .select()
        .single();
      if (error) throw error;
      return { action: 'created', contact: data };
    }
  }
}
