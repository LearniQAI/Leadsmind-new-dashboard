import { createAdminClient } from '@/lib/supabase/server';

export interface AttributionData {
  type: 'campaign' | 'sequence';
  campaign_id?: string;
  workflow_id?: string;
  step_id?: string;
  timestamp: string;
  attributed_at: string;
}

export class AttributionEngine {
  /**
   * Tracks an invoice payment and attributes it to the last marketing touchpoint.
   */
  static async trackInvoicePayment(invoiceId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supabase = createAdminClient();

      // 1. Fetch the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        return { success: false, error: invoiceError?.message || 'Invoice not found' };
      }

      const { contact_id, workspace_id, created_at } = invoice;
      if (!contact_id) {
        return { success: false, error: 'Invoice has no associated contact' };
      }

      const invoiceTime = new Date(created_at).getTime();
      const lookbackLimit = invoiceTime - 30 * 24 * 60 * 60 * 1000; // 30 days lookback

      // 2. Query last campaign tracking log (open/click) before invoice creation
      const { data: campaignLogs } = await supabase
        .from('email_tracking_logs')
        .select('campaign_id, event_type, timestamp')
        .eq('contact_id', contact_id)
        .eq('workspace_id', workspace_id)
        .in('event_type', ['open', 'click'])
        .lt('timestamp', new Date(invoiceTime).toISOString())
        .gte('timestamp', new Date(lookbackLimit).toISOString())
        .order('timestamp', { ascending: false })
        .limit(1);

      const latestCampaignLog = campaignLogs?.[0];

      // 3. Query last completed workflow step before invoice creation
      const { data: workflowLogs } = await supabase
        .from('workflow_step_logs')
        .select(`
          step_id,
          completed_at,
          execution:workflow_executions (
            workflow_id,
            contact_id
          )
        `)
        .eq('workspace_id', workspace_id)
        .eq('status', 'completed')
        .lt('completed_at', new Date(invoiceTime).toISOString())
        .gte('completed_at', new Date(lookbackLimit).toISOString())
        .order('completed_at', { ascending: false });

      // Filter logs for the specific contact_id (since we can't join directly in simple client-side filters)
      const contactWorkflowLogs = (workflowLogs || []).filter((log: any) => {
        const execution = Array.isArray(log.execution) ? log.execution[0] : log.execution;
        return execution && execution.contact_id === contact_id;
      });

      const latestWorkflowLog = contactWorkflowLogs[0];

      // 4. Compare timestamps and attribute
      let attribution: AttributionData | null = null;

      const campaignTime = latestCampaignLog ? new Date(latestCampaignLog.timestamp).getTime() : 0;
      const workflowTime = latestWorkflowLog ? new Date(latestWorkflowLog.completed_at).getTime() : 0;

      if (campaignTime > 0 || workflowTime > 0) {
        if (campaignTime >= workflowTime && latestCampaignLog) {
          attribution = {
            type: 'campaign',
            campaign_id: latestCampaignLog.campaign_id,
            timestamp: latestCampaignLog.timestamp,
            attributed_at: new Date().toISOString()
          };
        } else if (latestWorkflowLog) {
          const execution = Array.isArray(latestWorkflowLog.execution) 
            ? latestWorkflowLog.execution[0] 
            : latestWorkflowLog.execution;

          attribution = {
            type: 'sequence',
            workflow_id: execution?.workflow_id,
            step_id: latestWorkflowLog.step_id,
            timestamp: latestWorkflowLog.completed_at,
            attributed_at: new Date().toISOString()
          };
        }
      }

      // 5. Update invoice status, paid_at timestamp, and append attribution metadata
      const currentMetadata = typeof invoice.metadata === 'object' ? (invoice.metadata || {}) : {};
      const updatedMetadata = {
        ...currentMetadata,
        attribution
      };

      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          metadata: updatedMetadata
        })
        .eq('id', invoiceId)
        .select('*, contact:contacts(*)')
        .single();

      if (updateError) throw updateError;

      try {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        const contactName = (updatedInvoice as any)?.contact
          ? `${(updatedInvoice as any).contact.first_name || ''} ${(updatedInvoice as any).contact.last_name || ''}`.trim()
          : null;
        dispatchWebhook(workspace_id, 'invoice.paid', {
          invoice: {
            id: updatedInvoice.id,
            number: updatedInvoice.invoice_number,
            amount: updatedInvoice.total_amount,
            currency: updatedInvoice.currency || 'ZAR',
            paid_at: updatedInvoice.paid_at || new Date().toISOString(),
            contact: {
              id: updatedInvoice.contact_id,
              name: contactName || null,
            }
          }
        }).catch(() => {});
      } catch (webhookErr) {
        console.error('[webhook-dispatch-error]', webhookErr);
      }

      return { success: true, data: updatedInvoice };
    } catch (error: any) {
      console.error('[AttributionEngine] Error tracking invoice payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Computes dashboard ROI metrics for the workspace.
   */
  static async getAttributionMetrics(workspaceId: string): Promise<{
    totalRandRevenue: number;
    ctor: number;
    stepRevenue: Record<string, { step_id: string; workflow_name: string; step_type: string; revenue: number }>;
  }> {
    const supabase = createAdminClient();

    // 1. Fetch total paid invoice revenue
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, metadata')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid');

    const totalRandRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // 2. Fetch CTOR from email tracking logs (clicks / opens * 100)
    const { data: trackingLogs } = await supabase
      .from('email_tracking_logs')
      .select('event_type')
      .eq('workspace_id', workspaceId);

    let opens = 0;
    let clicks = 0;
    (trackingLogs || []).forEach((log) => {
      if (log.event_type === 'open') opens++;
      if (log.event_type === 'click') clicks++;
    });

    const ctor = opens > 0 ? Math.round((clicks / opens) * 1000) / 10 : 0;

    // 3. Compute step-level revenue generations
    const stepRevenueMap: Record<string, { step_id: string; workflow_name: string; step_type: string; revenue: number }> = {};

    const sequenceAttributedInvoices = (invoices || []).filter((inv) => {
      const meta = inv.metadata as any;
      return meta?.attribution?.type === 'sequence' && meta?.attribution?.step_id;
    });

    if (sequenceAttributedInvoices.length > 0) {
      // Load workflow step details to populate names
      const stepIds = sequenceAttributedInvoices.map((inv) => (inv.metadata as any).attribution.step_id);
      
      const { data: steps } = await supabase
        .from('workflow_steps')
        .select(`
          id,
          type,
          workflow:workflows (
            name
          )
        `)
        .in('id', stepIds);

      const stepDetails: Record<string, { workflow_name: string; type: string }> = {};
      (steps || []).forEach((step: any) => {
        const wf = Array.isArray(step.workflow) ? step.workflow[0] : step.workflow;
        stepDetails[step.id] = {
          workflow_name: wf?.name || 'Unknown Sequence',
          type: step.type || 'Email Step'
        };
      });

      sequenceAttributedInvoices.forEach((inv) => {
        const attr = (inv.metadata as any).attribution;
        const stepId = attr.step_id;
        const amount = Number(inv.total_amount || 0);

        if (!stepRevenueMap[stepId]) {
          const detail = stepDetails[stepId] || { workflow_name: 'Unknown Sequence', type: 'Email Step' };
          stepRevenueMap[stepId] = {
            step_id: stepId,
            workflow_name: detail.workflow_name,
            step_type: detail.type,
            revenue: 0
          };
        }
        stepRevenueMap[stepId].revenue += amount;
      });
    }

    return {
      totalRandRevenue,
      ctor,
      stepRevenue: stepRevenueMap
    };
  }
}
