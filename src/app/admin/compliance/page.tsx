import { createServerClient } from '@/lib/supabase/server';
import { getUserAccessInfo, getCurrentWorkspaceId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ComplianceAuditCenter from '@/components/admin/ComplianceAuditCenter';

export default async function CompliancePage() {
  const { role } = await getUserAccessInfo();
  if (!role || !['admin', 'compliance'].includes(role)) {
    redirect('/unauthenticated'); // Fallback redirect for unauthorized roles
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-white !text-dash-textMuted flex items-center justify-center p-6">
        <div className="text-center bg-white border border-dash-border p-8 rounded-xl shadow-sm">
          <p className="text-red font-semibold text-lg">No Active Workspace Context</p>
          <p className="!text-dash-textMuted text-sm mt-2">Please select or switch to a workspace to access the Compliance Hub.</p>
        </div>
      </div>
    );
  }

  const supabase = await createServerClient();

  // Retrieve workspace contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, id_number, kyc_risk_ratings(overall_rating)')
    .eq('workspace_id', workspaceId)
    .order('first_name', { ascending: true });

  // Retrieve workspace STR reports
  const { data: reports } = await supabase
    .from('str_reports')
    .select('*, contact:contacts(first_name, last_name, id_number)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Convert contacts list for UI layer
  const formattedContacts = (contacts || []).map((c: any) => {
    const ratings = Array.isArray(c.kyc_risk_ratings) ? c.kyc_risk_ratings[0] : c.kyc_risk_ratings;
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name || '',
      email: c.email || '',
      phone: c.phone || '',
      id_number: c.id_number || '',
      kyc_risk_flag: ratings?.overall_rating || 'LOW'
    };
  });

  return (
    <div className="min-h-screen bg-white !text-dash-text p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-dash-border pb-5">
          <div>
            <div className="flex items-center space-x-3">
              <span className="bg-red/10 text-red border border-red/20 px-3 py-1 rounded-full text-xs font-semibold">
                FICA Regulatory Control
              </span>
            </div>
            <h1 className="text-3xl font-bold !text-dash-text mt-2 tracking-tight">Compliance Hub & STR Center</h1>
            <p className="!text-dash-textMuted mt-1 text-sm">Draft, serialize, and lock official Suspicious Transaction Reports for the Financial Intelligence Centre.</p>
          </div>
        </header>

        <ComplianceAuditCenter 
          contacts={formattedContacts} 
          initialReports={reports || []} 
        />
      </div>
    </div>
  );
}
