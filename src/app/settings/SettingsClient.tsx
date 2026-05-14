"use client";
// @ts-nocheck
import React, { useState } from 'react';
import {
  User,
  Settings as SettingsIcon,
  Users,
  Palette,
  CreditCard,
  Code2,
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Globe,
  Zap,
  Activity,
  Trash2,
  ChevronRight,
  Monitor,
  Terminal,
  Webhook,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Search,
  AlignLeft,
  AlignRight,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import useGlobalContext from "@/hooks/use-context";
import { useDirection } from "@/hooks/useDirection";
import {
  inviteTeamMember,
  updateWorkspaceBranding,
  createWebhook,
  getWorkspaceApiKey,
  generateWorkspaceApiKey,
  updateWorkspaceLogo
} from '@/app/actions/settings';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SettingsClient({
  branding,
  members,
  webhooks,
  auditData
}: {
  branding: any,
  members: any[],
  webhooks: any[],
  auditData: any
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useGlobalContext();
  const { direction, toggleDirection } = useDirection();
  const [activeTab, setActiveTab] = useState('workspace');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (activeTab === 'api') {
      getWorkspaceApiKey().then(res => {
        if (res.data) setApiKey(res.data);
      });
    }
  }, [activeTab]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `logo-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('branding')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      const res = await updateWorkspaceLogo(publicUrl);
      if (res.error) throw new Error(res.error);

      toast.success('Logo updated successfully');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm('Regenerating the API key will break existing integrations. Continue?')) return;
    const res = await generateWorkspaceApiKey();
    if (res.data) {
      setApiKey(res.data);
      toast.success('API Key regenerated');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSaving(true);
    const res = await inviteTeamMember(inviteEmail, inviteRole);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Invitation sent to ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteEmail('');
    }
    setIsSaving(false);
  };

  const handleSaveWorkspace = async () => {
    setIsSaving(true);
    const nameInput = document.getElementById('workspace_name') as HTMLInputElement;
    const res = await updateWorkspaceBranding({ platform_name: nameInput?.value || 'LeadsMind' });
    if (res.error) toast.error(res.error);
    else {
      toast.success('Workspace settings saved');
      router.refresh();
    }
    setIsSaving(false);
  };

  const [primaryColor, setPrimaryColor] = useState(branding?.primary_color || '#2563eb');

  const handleSaveBranding = async () => {
    setIsSaving(true);
    const res = await updateWorkspaceBranding({ primary_color: primaryColor });
    if (res.error) toast.error(res.error);
    else {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      toast.success('Neural branding colors synced globally');
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleNewWebhook = async () => {
    const workspaceId = branding?.workspace_id || 'default';
    const url = `${window.location.origin}/api/webhooks/incoming?workspace_id=${workspaceId}`;

    const res = await createWebhook(url, ['lead.created', 'order.completed', 'chat.started']);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Neural Webhook endpoint generated successfully');
      router.refresh();
    }
  };

  const menuItems = [
    { id: 'workspace', label: 'Workspace', icon: Globe, description: 'Neural configuration & identity' },
    { id: 'team', label: 'Team Node', icon: Users, description: 'Manage access protocols' },
    { id: 'branding', label: 'Branding', icon: Palette, description: 'Interface identity markers' },
    { id: 'api', label: 'API & Webhooks', icon: Code2, description: 'Neural handshakes' },
    { id: 'pricing', label: 'Billing', icon: CreditCard, description: 'Resource allocation' },
    { id: 'audit', label: 'Security', icon: ShieldCheck, description: 'Audit logs & integrity' },
    { id: 'appearance', label: 'Appearance', icon: Monitor, description: 'Visual preferences' },
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-160px)]">
      {/* Left Panel - Navigation */}
      <div className="w-full lg:w-[320px] flex-shrink-0 border-r border-white/5 bg-n800/50 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-t3" size={14} />
            <input
              type="text"
              placeholder="Filter settings..."
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-[12px] text-t1 outline-none focus:border-accent/30 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${isActive
                  ? "bg-accent/10 text-accent2 shadow-sm ring-1 ring-white/10"
                  : "text-t2 hover:bg-white/[0.03] hover:text-t1"
                  }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "bg-accent/20 text-accent" : "bg-white/[0.03] text-t3 group-hover:text-t2"
                  }`}>
                  <Icon size={16} />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[13px] font-bold truncate leading-tight">{item.label}</span>
                  <span className="text-[10px] text-t3 font-medium truncate opacity-60">{item.description}</span>
                </div>
                {isActive && <ChevronRight size={14} className="ml-auto text-accent2" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-[#04091a] relative overflow-y-auto">
        {/* Content Header */}
        <div className="sticky top-0 z-10 bg-n900/80 backdrop-blur-md px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-[18px] font-space font-bold text-t1 uppercase tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label} <span className="text-accent2">Settings</span>
            </h3>
            <p className="text-[11px] text-t3 uppercase font-black tracking-widest mt-0.5">
              {menuItems.find(m => m.id === activeTab)?.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-t2 hover:text-t1 rounded-xl text-[11px] font-bold transition-all border border-white/5 uppercase tracking-widest">
              Need Help?
            </button>
          </div>
        </div>

        <div className="p-8 max-w-4xl mx-auto">
          {activeTab === 'workspace' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid gap-8">
                <div className="space-y-6 bg-n800 border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Core Configuration</h4>
                      <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Global workspace identity</p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-t3">Workspace Name</label>
                      <input
                        id="workspace_name"
                        type="text"
                        defaultValue={branding?.platform_name || 'LeadsMind Workspace'}
                        className="w-full bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold focus:border-accent/50 transition-all outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-t3">Permanent Slug</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-t3 font-mono text-[11px] flex items-center">
                          leadsmind.ai/w/{branding?.workspace_id || 'neural-node-01'}
                        </div>
                        <button
                          onClick={() => copyToClipboard(`leadsmind.ai/w/${branding?.workspace_id}`, 'slug')}
                          className="px-4 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-colors"
                        >
                          {copied === 'slug' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSaveWorkspace}
                      disabled={isSaving}
                      className="bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-11 px-8 rounded-xl shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Processing...' : 'Save Configuration'}
                    </button>
                  </div>
                </div>

                <div className="bg-n800 border border-white/5 rounded-2xl p-8">
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="text-[14px] font-bold text-t1 uppercase font-space">Workspace Deletion</h4>
                      <p className="text-[12px] text-t3 leading-relaxed">
                        Permanently remove this workspace and all its data. This action is irreversible.
                      </p>
                    </div>
                    <button className="flex-shrink-0 px-4 py-2.5 bg-red/10 text-red hover:bg-red/20 border border-red/20 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all">
                      Terminate Node
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Active Team Nodes</h4>
                  <p className="text-[11px] text-t3 font-medium uppercase tracking-widest mt-0.5">Authorized access protocols</p>
                </div>
                <button
                  onClick={() => setIsInviteOpen(true)}
                  className="bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-lg shadow-accent/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Plus size={14} /> Invite Team Member
                </button>
              </div>

              <div className="bg-n800 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4">Identity</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4">Protocol</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-t4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {members.map((member: any) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-accent2/10 border border-accent2/20 flex items-center justify-center text-accent2 font-space font-bold text-sm">
                              {member.user?.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-t1">{member.user?.full_name || 'Anonymous Member'}</span>
                              <span className="text-[10px] text-t3 font-medium">{member.user?.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${member.role === 'admin' ? 'bg-purple/10 text-purple border border-purple/20' : 'bg-white/5 text-t3 border border-white/10'
                            }`}>
                            {member.role || 'Member'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-black text-t3 uppercase tracking-widest">Active</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-t4 hover:text-red transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-n800 border border-white/5 rounded-2xl p-8 space-y-6">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-t3">Platform Logo</label>
                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-40 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/[0.01] hover:border-accent/30 hover:bg-accent/5 transition-all group cursor-pointer overflow-hidden relative"
                    >
                      {branding?.logo_url ? (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center p-6">
                          <img src={branding.logo_url} alt="Logo" className="max-h-20 object-contain drop-shadow-lg" />
                          <div className="absolute inset-0 bg-n900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                            <span className="text-[11px] font-black text-white uppercase tracking-widest">Change Logo</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-t4 group-hover:text-accent transition-colors">
                            <Plus size={24} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-t4">Upload Brand Asset</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-t3">Identity Color</label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer hover:scale-105 transition-transform relative overflow-hidden"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <input
                          type="color"
                          value={primaryColor.startsWith('#') ? primaryColor.substring(0, 7) : '#2563eb'}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 bg-n600 border border-white/5 rounded-xl px-4 py-3 text-t1 font-mono text-xs uppercase outline-none focus:border-accent/50"
                      />
                    </div>
                    <button
                      onClick={handleSaveBranding}
                      disabled={isSaving}
                      className="w-full bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-11 rounded-xl mt-2 transition-all shadow-lg shadow-accent/20"
                    >
                      {isSaving ? 'Updating...' : 'Save Branding'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="bg-n800 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center flex-1">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 border border-accent/20">
                      <Monitor className="w-7 h-7 text-accent" />
                    </div>
                    <h4 className="text-[16px] font-space font-bold text-t1 uppercase mb-2">Live Preview</h4>
                    <p className="text-[12px] text-t3 max-w-[200px] leading-relaxed">Your workspace interface will automatically adapt to these identity markers.</p>
                  </div>

                  <div className="bg-accent/5 border border-accent/10 rounded-2xl p-6">
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-accent mb-2">Neural Tip</h5>
                    <p className="text-[11px] text-t2 leading-relaxed">Use a high-contrast primary color for better accessibility across the system components.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-n800 border border-white/10 rounded-2xl p-8 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-accent w-5 h-5" />
                    <h4 className="text-[15px] font-space font-bold text-t1 uppercase">Master API Secret</h4>
                  </div>
                  <button
                    onClick={handleRegenerateKey}
                    className="text-[10px] font-black text-accent hover:text-accent2 uppercase tracking-[0.2em] transition-colors"
                  >
                    Regenerate Key
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    readOnly
                    value={apiKey || '••••••••••••••••••••••••'}
                    className="flex-1 bg-n900 border border-white/5 rounded-xl px-4 py-4 text-t1 font-mono text-xs outline-none focus:border-accent/30"
                  />
                  <button
                    onClick={() => copyToClipboard(apiKey || '', 'apikey')}
                    className="px-6 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-all"
                  >
                    {copied === 'apikey' ? <Check size={18} className="text-green" /> : <Copy size={18} />}
                  </button>
                </div>
                <div className="flex items-start gap-2 p-3 bg-red/5 border border-red/10 rounded-xl">
                  <ShieldAlert size={14} className="text-red mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-red/80 uppercase tracking-widest leading-relaxed">
                    CRITICAL: Never expose this secret in client-side code. Use it for backend neural handshakes only.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Incoming Data Stream</h4>
                  <span className="px-2 py-0.5 rounded bg-green/10 text-green text-[9px] font-black uppercase tracking-widest">Active</span>
                </div>
                <div className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4">
                  <p className="text-[12px] text-t3 leading-relaxed">Use this endpoint to automatically ingest data from external platforms (Zapier, Custom CRM, etc).</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/incoming?workspace_id=${branding?.workspace_id}`}
                      className="flex-1 bg-n900 border border-white/5 rounded-xl px-4 py-3 text-accent font-mono text-[11px] outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/incoming?workspace_id=${branding?.workspace_id}`, 'webhook_url')}
                      className="px-4 bg-white/5 border border-white/5 text-t3 hover:text-t1 rounded-xl transition-all"
                    >
                      {copied === 'webhook_url' ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Active Webhooks</h4>
                  <button
                    onClick={handleNewWebhook}
                    className="flex items-center gap-2 text-accent text-[11px] font-black uppercase tracking-widest hover:text-accent2 transition-all"
                  >
                    <Plus size={14} /> New Endpoint
                  </button>
                </div>
                <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 bg-n800 shadow-sm">
                  {webhooks.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                      <Webhook size={32} className="text-t4 mb-4 opacity-20" />
                      <p className="text-[11px] font-black text-t4 uppercase tracking-[0.3em]">No active data streams</p>
                    </div>
                  ) : (
                    webhooks.map(hook => (
                      <div key={hook.id} className="p-5 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center text-green border border-green/10">
                            <Activity size={18} />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[13px] font-bold text-t1 truncate max-w-[300px]">{hook.url}</p>
                            <div className="flex gap-1.5 mt-1">
                              {hook.events.map((e: string) => (
                                <span key={e} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-black text-t4 uppercase border border-white/5">{e}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button className="w-9 h-9 flex items-center justify-center text-t4 hover:text-red transition-all rounded-lg hover:bg-red/10">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-8 bg-gradient-to-br from-accent/20 to-n800 border border-accent/20 rounded-3xl relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-3">
                    <span className="inline-block px-3 py-1 bg-accent text-white font-black uppercase tracking-widest text-[10px] rounded-full shadow-lg shadow-accent/30">Enterprise Pro Node</span>
                    <h4 className="text-[28px] font-space font-black text-t1 tracking-tighter leading-none">UNLIMITED NEURAL CAPACITY</h4>
                    <p className="text-t2 text-[12px] font-bold uppercase tracking-widest flex items-center gap-2">
                      Lifetime Access <span className="w-1 h-1 rounded-full bg-t4"></span> Priority Neural Support
                    </p>
                  </div>
                  <button onClick={() => toast.info('You are already on the highest tier.')} className="bg-white text-accent hover:scale-105 active:scale-95 font-black uppercase tracking-widest text-[11px] h-14 px-10 rounded-2xl shadow-xl transition-all">
                    Active Plan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Active Seats', value: `${members.length} / ∞`, icon: <Users size={16} /> },
                  { label: 'Automation Cycles', value: 'Unlimited', icon: <Zap size={16} /> },
                  { label: 'Storage Node', value: '500 GB', icon: <CreditCard size={16} /> }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4 hover:border-accent/30 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-t3 group-hover:text-accent group-hover:bg-accent/10 transition-all">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-t4 uppercase tracking-widest mb-1">{item.label}</p>
                      <p className="text-[18px] font-space font-black text-t1">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Contacts', value: auditData?.leads || 0, icon: <Users size={18} /> },
                  { label: 'Orders', value: auditData?.orders || 0, icon: <CreditCard size={18} /> },
                  { label: 'Tasks', value: auditData?.tasks || 0, icon: <ShieldCheck size={18} /> },
                  { label: 'Chats', value: auditData?.conversations || 0, icon: <Activity size={18} /> },
                ].map((item: any, i: number) => (
                  <div key={i} className="p-6 bg-n800 border border-white/5 rounded-2xl space-y-4 hover:border-accent/20 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">{item.icon}</div>
                      <span className="px-2 py-0.5 rounded bg-green/10 text-green text-[8px] font-black uppercase tracking-widest border border-green/20">Live</span>
                    </div>
                    <div>
                      <span className="block text-[22px] font-space font-black text-t1">{item.value}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-t3">{item.label} Verified</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-green/5 border border-green/10 rounded-3xl flex items-center gap-6 group">
                <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center text-green border border-green/20 animate-pulse-slow">
                  <Check size={32} />
                </div>
                <div>
                  <h4 className="text-[18px] font-space font-black text-t1 uppercase">Integrity Verified</h4>
                  <p className="text-[12px] text-t3 leading-relaxed max-w-lg">
                    All neural data migrations and workspace protocols have been verified. System integrity is currently at 100%.
                  </p>
                </div>
              </div>

              <div className="bg-n800 border border-white/5 rounded-2xl p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-t4">
                    <Terminal size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-t1 uppercase font-space">Audit Logs</span>
                    <span className="text-[11px] text-t3">View full system access history</span>
                  </div>
                </div>
                <button className="flex items-center gap-2 text-accent text-[11px] font-black uppercase tracking-widest hover:text-accent2 transition-all group">
                  Open Logs <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-n800 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <Palette className="text-accent w-5 h-5" />
                    <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Interface Theme</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => theme === 'dark' && toggleTheme()}
                      className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-accent bg-accent/5 text-accent' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
                    >
                      <Zap size={24} className={theme === 'light' ? 'fill-accent' : ''} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Solar Mode</span>
                    </button>
                    <button
                      onClick={() => theme === 'light' && toggleTheme()}
                      className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
                    >
                      <Monitor size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Neural Dark</span>
                    </button>
                  </div>
                </div>

                <div className="bg-n800 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <AlignLeft className="text-accent w-5 h-5" />
                    <h4 className="text-[13px] font-black text-t1 uppercase tracking-widest">Layout Direction</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => direction !== 'ltr' && toggleDirection()}
                      className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${direction === 'ltr' ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
                    >
                      <AlignLeft size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Left to Right</span>
                    </button>
                    <button
                      onClick={() => direction !== 'rtl' && toggleDirection()}
                      className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${direction === 'rtl' ? 'border-accent bg-accent/5 text-accent shadow-lg shadow-accent/10' : 'border-white/5 bg-n900 text-t4 hover:border-white/10'}`}
                    >
                      <AlignRight size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Right to Left</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-n900/90 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setIsInviteOpen(false)}
          />
          <div className="relative w-full max-w-md bg-n800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-[16px] font-space font-bold text-t1 uppercase">Invite <span className="text-accent2">Member</span></h4>
                    <p className="text-[11px] text-t3 font-medium uppercase tracking-widest">Add a new node to your team</p>
                  </div>
                </div>
                <button onClick={() => setIsInviteOpen(false)} className="text-t3 hover:text-t1 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-t3">Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-t4" size={14} />
                    <input
                      autoFocus
                      type="email"
                      required
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-n900 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-t1 font-bold outline-none focus:border-accent/50 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-t3">Access Protocol (Role)</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-n900 border border-white/5 rounded-xl px-4 py-3 text-t1 font-bold outline-none focus:border-accent/50 transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="member">Member (Standard Access)</option>
                    <option value="admin">Admin (Full Control)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/5 text-t2 font-bold hover:bg-white/5 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-accent hover:bg-accent2 text-white font-black uppercase tracking-widest text-[11px] h-12 rounded-xl shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
