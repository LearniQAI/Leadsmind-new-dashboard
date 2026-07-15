"use client";
import React from 'react';
import { Globe, Copy, Check, CreditCard, Shield } from 'lucide-react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WorkspaceTabProps {
  branding: any;
  isSaving: boolean;
  onSave: (name: string) => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

export default function WorkspaceTab({ 
  branding, 
  isSaving, 
  onSave, 
  onCopy, 
  copiedId 
}: WorkspaceTabProps) {
  const [name, setName] = React.useState(branding?.platform_name || 'LeadsMind Workspace');
  const { role } = useDashboardContext() as any;
  const isAdmin = role === 'admin' || role === 'owner';

  const [settings, setSettings] = React.useState({
    show_draft_invoices: false,
    allow_partial_payments: false,
    enable_overdue_alert_banner: false,
    show_line_items: true,
  });
  const [projectSettings, setProjectSettings] = React.useState({
    show_tasks: true,
    show_employee_names: false,
    show_financials: false,
  });
  const [loadingSettings, setLoadingSettings] = React.useState(true);
  const [kycSettings, setKycSettings] = React.useState({
    registered_name: '',
    company_reg_number: '',
    kyc_data_sharing_entities_str: '',
  });
  const [isKycSaving, setIsKycSaving] = React.useState(false);

  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    async function loadSettings() {
      if (!branding?.workspace_id) return;
      const { data, error } = await supabase
        .from('workspaces')
        .select('invoice_settings, project_settings, registered_name, company_reg_number, kyc_data_sharing_entities')
        .eq('id', branding.workspace_id)
        .single();
      if (!error) {
        if (data?.invoice_settings) {
          setSettings({
            show_draft_invoices: data.invoice_settings.show_draft_invoices ?? false,
            allow_partial_payments: data.invoice_settings.allow_partial_payments ?? false,
            enable_overdue_alert_banner: data.invoice_settings.enable_overdue_alert_banner ?? false,
            show_line_items: data.invoice_settings.show_line_items ?? true,
          });
        }
        if (data?.project_settings) {
          setProjectSettings({
            show_tasks: data.project_settings.show_tasks ?? true,
            show_employee_names: data.project_settings.show_employee_names ?? false,
            show_financials: data.project_settings.show_financials ?? false,
          });
        }
        setKycSettings({
          registered_name: data?.registered_name || '',
          company_reg_number: data?.company_reg_number || '',
          kyc_data_sharing_entities_str: (data?.kyc_data_sharing_entities || []).join(', '),
        });
      }
      setLoadingSettings(false);
    }
    loadSettings();
  }, [branding?.workspace_id, supabase]);

  const handleToggle = async (key: string, value: boolean) => {
    if (!branding?.workspace_id) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    const { saveInvoiceSettings } = await import('@/app/actions/finance');
    const res = await saveInvoiceSettings(branding.workspace_id, updated);
    if (res.error) {
      toast.error(res.error);
      // rollback
      setSettings(settings);
    } else {
      toast.success('Financial controls updated successfully');
    }
  };

  const handleProjectToggle = async (key: string, value: boolean) => {
    if (!branding?.workspace_id) return;
    const updated = { ...projectSettings, [key]: value };
    setProjectSettings(updated);

    const { saveWorkspaceProjectSettings } = await import('@/app/actions/projects');
    const res = await saveWorkspaceProjectSettings(branding.workspace_id, updated);
    if (res.error) {
      toast.error(res.error);
      // rollback
      setProjectSettings(projectSettings);
    } else {
      toast.success('Project visibility controls updated successfully');
    }
  };

  const handleSaveKycSettings = async () => {
    if (!branding?.workspace_id) return;
    setIsKycSaving(true);
    try {
      const { saveWorkspaceKycSettings } = await import('@/app/actions/workspace');
      const entities = kycSettings.kyc_data_sharing_entities_str
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

      const res = await saveWorkspaceKycSettings(branding.workspace_id, {
        registered_name: kycSettings.registered_name,
        company_reg_number: kycSettings.company_reg_number,
        kyc_data_sharing_entities: entities
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('KYC & Consent configurations saved successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsKycSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="grid gap-8">
        <div className="space-y-6 bg-white border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-dash-accent"></div>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
              <Globe size={20} />
            </div>
            <div>
              <h4 className="text-[15px] font-bold !text-dash-text">Core configuration</h4>
              <p className="text-[11px] !text-dash-textMuted font-medium">Global workspace identity</p>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold !text-dash-textMuted">Workspace name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold focus:border-dash-accent transition-all motion-reduce:transition-none outline-none text-sm disabled:opacity-60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold !text-dash-textMuted">Permanent slug</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-dash-surface border border-dash-border rounded-xl px-4 py-3 !text-dash-textMuted font-mono text-[11px] flex items-center">
                  leadsmind.io/w/{branding?.workspace_id || 'neural-node-01'}
                </div>
                <button
                  onClick={() => onCopy(`leadsmind.io/w/${branding?.workspace_id}`, 'slug')}
                  className="px-4 bg-dash-surface border border-dash-border !text-dash-textMuted hover:!text-dash-text rounded-xl transition-colors motion-reduce:transition-none"
                >
                  {copiedId === 'slug' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => onSave(name)}
                disabled={isSaving}
                className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] h-11 px-8 rounded-xl shadow-lg shadow-dash-accent/20 transition-all motion-reduce:transition-none disabled:opacity-50"
              >
                {isSaving ? 'Processing...' : 'Save configuration'}
              </button>
            </div>
          )}
        </div>

        {/* KYC & POPIA Consent Configurations */}
        {isAdmin && (
          <div className="space-y-6 bg-white border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-600">
                <Shield size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold !text-dash-text">KYC & POPIA consent configuration</h4>
                <p className="text-[11px] !text-dash-textMuted font-medium">FICA and POPIA statutory identity verification settings</p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold !text-dash-textMuted">Legal / registered name</label>
                  <input
                    type="text"
                    value={kycSettings.registered_name}
                    onChange={(e) => setKycSettings({ ...kycSettings, registered_name: e.target.value })}
                    placeholder="e.g. Acme Holdings (Pty) Ltd"
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold focus:border-purple-600 transition-all motion-reduce:transition-none outline-none text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold !text-dash-textMuted">Business registration number</label>
                  <input
                    type="text"
                    value={kycSettings.company_reg_number}
                    onChange={(e) => setKycSettings({ ...kycSettings, company_reg_number: e.target.value })}
                    placeholder="e.g. 2026/123456/07"
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold focus:border-purple-600 transition-all motion-reduce:transition-none outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold !text-dash-textMuted">Data-sharing entities (comma-separated)</label>
                <input
                  type="text"
                  value={kycSettings.kyc_data_sharing_entities_str}
                  onChange={(e) => setKycSettings({ ...kycSettings, kyc_data_sharing_entities_str: e.target.value })}
                  placeholder="e.g. TransUnion, Experian, HANIS, Home Affairs, Conveyancing Attorneys"
                  className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 !text-dash-text font-bold focus:border-purple-600 transition-all motion-reduce:transition-none outline-none text-sm"
                />
                <p className="text-[10px] !text-dash-textMuted">Specify third-party agencies and credit bureaus that verification checks will be processed through.</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveKycSettings}
                disabled={isKycSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] h-11 px-8 rounded-xl shadow-lg shadow-purple-600/20 transition-all motion-reduce:transition-none disabled:opacity-50"
              >
                {isKycSaving ? 'Saving...' : 'Save KYC settings'}
              </button>
            </div>
          </div>
        )}

        {isAdmin && !loadingSettings && (
          <div className="space-y-6 bg-white border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-dash-accent"></div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold !text-dash-text">Financial & portal configurations</h4>
                <p className="text-[11px] !text-dash-textMuted font-medium">Customer portal visibility & payment protocols</p>
              </div>
            </div>

            <div className="grid gap-6 divide-y divide-dash-border">
              {/* Toggle 1: Show Draft Invoices */}
              <div className="flex items-center justify-between pt-4 first:pt-0">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Show draft invoices</p>
                  <p className="text-[11px] !text-dash-textMuted">Allow clients to view draft-status invoices inside their billing portal directory.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.show_draft_invoices}
                  onClick={() => handleToggle('show_draft_invoices', !settings.show_draft_invoices)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    settings.show_draft_invoices ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      settings.show_draft_invoices ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Toggle 2: Custom Partial Payments */}
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Allow custom partial payments</p>
                  <p className="text-[11px] !text-dash-textMuted">Enable clients to key in custom payment amounts when checking out outstanding balances.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.allow_partial_payments}
                  onClick={() => handleToggle('allow_partial_payments', !settings.allow_partial_payments)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    settings.allow_partial_payments ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      settings.allow_partial_payments ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Toggle 3: Overdue Banner Alert */}
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Dashboard overdue alert banner</p>
                  <p className="text-[11px] !text-dash-textMuted">Display a warning alert banner at the top of the client portal dashboard if outstanding balances are overdue.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.enable_overdue_alert_banner}
                  onClick={() => handleToggle('enable_overdue_alert_banner', !settings.enable_overdue_alert_banner)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    settings.enable_overdue_alert_banner ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      settings.enable_overdue_alert_banner ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Toggle 4: Show Line Items */}
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Show invoice line items</p>
                  <p className="text-[11px] !text-dash-textMuted">Display detailed itemized breakdowns (lines) on customer invoices instead of just totals.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.show_line_items}
                  onClick={() => handleToggle('show_line_items', !settings.show_line_items)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    settings.show_line_items ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      settings.show_line_items ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {isAdmin && !loadingSettings && (
          <div className="space-y-6 bg-white border border-dash-border rounded-2xl p-8 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-600"></div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center text-amber-600">
                <Globe size={20} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold !text-dash-text">Projects visibility & delivery controls</h4>
                <p className="text-[11px] !text-dash-textMuted font-medium">Client portal project settings & safety filters</p>
              </div>
            </div>

            <div className="grid gap-6 divide-y divide-dash-border">
              {/* Toggle 1: Show Team Tasks */}
              <div className="flex items-center justify-between pt-4 first:pt-0">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Show team tasks</p>
                  <p className="text-[11px] !text-dash-textMuted">Allow clients to see individual non-milestone team tasks. If disabled, clients will only see milestones.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={projectSettings.show_tasks}
                  onClick={() => handleProjectToggle('show_tasks', !projectSettings.show_tasks)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    projectSettings.show_tasks ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      projectSettings.show_tasks ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Toggle 2: Show Employee Names */}
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Show internal employee names</p>
                  <p className="text-[11px] !text-dash-textMuted">Allow clients to see internal names of assignees. If disabled, assignees are masked under "Delivery Team".</p>
                </div>
                <button
                  role="switch"
                  aria-checked={projectSettings.show_employee_names}
                  onClick={() => handleProjectToggle('show_employee_names', !projectSettings.show_employee_names)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    projectSettings.show_employee_names ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      projectSettings.show_employee_names ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* Toggle 3: Show Financial Metrics */}
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1 pr-4">
                  <p className="text-xs font-bold !text-dash-text">Show project budget & tracked hours</p>
                  <p className="text-[11px] !text-dash-textMuted">Display financial columns including project budget, costs, and internal tracked hours in the portal.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={projectSettings.show_financials}
                  onClick={() => handleProjectToggle('show_financials', !projectSettings.show_financials)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 motion-reduce:transition-none outline-none",
                    projectSettings.show_financials ? "bg-dash-accent" : "bg-dash-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 motion-reduce:transition-none",
                      projectSettings.show_financials ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-white border border-dash-border rounded-2xl p-8 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <h4 className="text-[14px] font-bold !text-dash-text">Workspace deletion</h4>
                <p className="text-[12px] !text-dash-textMuted leading-relaxed">
                  Permanently remove this workspace and all its data. This action is irreversible.
                </p>
              </div>
              <button className="flex-shrink-0 px-4 py-2.5 bg-red/10 text-red hover:bg-red/20 border border-red/20 rounded-xl text-[11px] font-bold transition-all motion-reduce:transition-none">
                Delete workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

