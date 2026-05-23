import { createServerClient } from '@/lib/supabase/server';
import { WorkspaceAuditEngine } from './WorkspaceAuditEngine';

export class ApprovalFlowEngine {
  /**
   * Submits a new approval request.
   */
  public static async requestApproval(
    workspaceId: string, 
    requesterId: string, 
    approverId: string, 
    requestType: string, 
    targetEntityId: string, 
    notes: string = ''
  ) {
    const supabase = await createServerClient();
    
    const { data, error } = await supabase.from('approval_requests').insert({
      workspace_id: workspaceId,
      requester_id: requesterId,
      approver_id: approverId,
      request_type: requestType,
      target_entity_id: targetEntityId,
      notes
    }).select().single();

    if (error) throw error;

    await WorkspaceAuditEngine.logAction(
      workspaceId,
      requesterId,
      'approval_requested',
      'approval_request',
      data.id,
      { type: requestType, target: targetEntityId }
    );

    return data;
  }

  /**
   * Resolves an approval request.
   */
  public static async resolveApproval(workspaceId: string, requestId: string, approverId: string, status: 'approved' | 'rejected') {
    const supabase = await createServerClient();
    
    await supabase.from('approval_requests').update({
      status,
      resolved_at: new Date().toISOString()
    }).eq('id', requestId).eq('workspace_id', workspaceId);

    await WorkspaceAuditEngine.logAction(
      workspaceId,
      approverId,
      `approval_${status}`,
      'approval_request',
      requestId
    );
  }
}
