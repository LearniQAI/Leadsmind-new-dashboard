'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Settings, 
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
  Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState('workspace');
  const [copied, setCopied] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
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

  const handleInvite = async () => {
    const email = window.prompt('Enter Member Email:');
    if (!email) return;
    const res = await inviteTeamMember(email);
    if (res.error) toast.error(res.error);
    else toast.success(`Invitation sent to ${email}`);
  };

  const handleSaveWorkspace = async () => {
    setIsSaving(true);
    const nameInput = document.querySelector('input[defaultValue]') as HTMLInputElement;
    const res = await updateWorkspaceBranding({ platform_name: nameInput?.value || 'LeadsMind' });
    if (res.error) toast.error(res.error);
    else {
      toast.success('Workspace settings saved');
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleNewWebhook = async () => {
    const url = window.prompt('Enter Webhook URL:');
    if (!url) return;
    const res = await createWebhook(url, ['all']);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Webhook created');
      router.refresh();
    }
  };

  const tabs = [
    { id: 'workspace', label: 'Workspace', icon: <Globe size={16} /> },
    { id: 'team', label: 'Team', icon: <Users size={16} /> },
    { id: 'branding', label: 'Branding', icon: <Palette size={16} /> },
    { id: 'pricing', label: 'Pricing', icon: <Zap size={16} /> },
    { id: 'api', label: 'API & Webhooks', icon: <Code2 size={16} /> },
    { id: 'audit', label: 'System Health', icon: <Activity size={16} /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-120px)]">
      {/* Sidebar Tabs */}
      <div className="lg:w-64 space-y-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 px-4 mb-4">Command Center</h2>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20 italic' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#0b0b1a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        
        {activeTab === 'workspace' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Workspace Configuration</h3>
              <p className="text-white/40 text-sm font-medium">Manage your neural workspace identity and core settings.</p>
            </div>
            
            <div className="grid gap-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Workspace Name</label>
                <input type="text" defaultValue={branding?.platform_name || 'LeadsMind Workspace'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold italic focus:border-primary/50 transition-all outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Workspace Slug</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value="leadsmind.ai/workspace-alpha" className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-white/40 font-mono text-xs outline-none" />
                  <Button variant="ghost" onClick={() => copyToClipboard('leadsmind.ai/workspace-alpha', 'slug')} className="bg-white/5 border border-white/10 text-white/40 hover:text-white rounded-xl">
                    {copied === 'slug' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleSaveWorkspace}
                disabled={isSaving}
                className="bg-primary hover:bg-primary-dark text-white font-black uppercase italic tracking-widest text-[10px] h-12 w-fit px-12 rounded-xl mt-4"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Team Nodes</h3>
                <p className="text-white/40 text-sm font-medium">Manage access protocols for your neural workspace.</p>
              </div>
              <Button 
                onClick={handleInvite}
                className="bg-primary hover:bg-primary-dark text-white font-black uppercase italic tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-lg shadow-primary/20"
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Invite Member
              </Button>
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/[0.02] border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Member</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Protocol</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((member: any) => (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-black text-xs italic">
                            {member.user?.full_name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white italic">{member.user?.full_name || 'Anonymous Node'}</p>
                            <p className="text-[10px] text-white/20 font-bold lowercase">{member.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="text-[9px] font-black uppercase tracking-widest bg-white/10 text-white/60 border-none px-2 py-0.5">{member.role || 'Member'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Linked</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-white/20 hover:text-rose-500"><Trash2 size={14} /></Button>
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
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Neural Branding</h3>
              <p className="text-white/40 text-sm font-medium">Customize the interface identity of your workspace.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
               <div className="space-y-6">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Platform Logo</label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-40 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 bg-white/[0.02] hover:border-primary/50 transition-all group cursor-pointer overflow-hidden relative"
                    >
                      {branding?.logo_url ? (
                        <>
                          <img src={branding.logo_url} alt="Logo" className="max-h-24 object-contain" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Change Logo</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Upload SVG/PNG</span>
                        </>
                      )}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Primary Identity Color</label>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/20 border border-white/10 cursor-pointer hover:scale-110 transition-transform" />
                       <input type="text" defaultValue={branding?.primary_color || '#1359FF'} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs uppercase outline-none focus:border-primary/50" />
                    </div>
                 </div>
               </div>

               <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center mb-6 border border-primary/30">
                    <Zap className="w-8 h-8 text-primary" />
                 </div>
                 <h4 className="text-lg font-black text-white uppercase italic tracking-tighter mb-2">Live Preview</h4>
                 <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold max-w-[200px]">Your workspace will automatically adapt to these identity markers.</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Universal API</h3>
                  <p className="text-white/40 text-sm font-medium">Securely connect your workspace to external neural networks.</p>
                </div>
                <Button 
                  onClick={handleNewWebhook}
                  className="bg-primary hover:bg-primary-dark text-white font-black uppercase italic tracking-widest text-[10px] h-10 px-6 rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" /> New Webhook
                </Button>
             </div>

             <div className="p-8 bg-white/[0.02] border border-white/10 rounded-3xl space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <ShieldCheck className="text-primary w-5 h-5" />
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Master API Secret</h4>
                   </div>
                   <Button onClick={handleRegenerateKey} variant="ghost" className="text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/10">Regenerate</Button>
                </div>
                <div className="flex gap-2">
                   <input 
                     type="password" 
                     readOnly 
                     value={apiKey || '••••••••••••••••••••••••'} 
                     className="flex-1 bg-[#050510] border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-xs outline-none focus:border-primary/50" 
                   />
                   <Button 
                     onClick={() => copyToClipboard(apiKey || '', 'apikey')}
                     className="bg-white/5 border border-white/10 text-white/40 hover:text-white rounded-xl px-6"
                   >
                     {copied === 'apikey' ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                   </Button>
                </div>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-relaxed">Warning: Never expose this secret in client-side code. Use it for backend-to-backend neural handshakes only.</p>
             </div>

             <div className="space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">External Form Integration</h4>
                <div className="p-6 bg-[#050510] border border-white/10 rounded-2xl space-y-4">
                   <p className="text-xs text-white/40 leading-relaxed font-medium">Copy this snippet to any external website to capture leads directly into your LeadsMind CRM.</p>
                   <div className="relative group">
                      <pre className="p-4 bg-black/40 rounded-xl border border-white/5 text-[10px] text-primary font-mono overflow-x-auto">
                        {`<script src="https://leadsmind.ai/api/embed.js" \n        data-key="${apiKey || 'YOUR_API_KEY'}" \n        data-workspace-id="${branding?.workspace_id || 'ID'}"></script>`}
                      </pre>
                      <Button 
                        onClick={() => copyToClipboard(`<script src="https://leadsmind.ai/api/embed.js" data-key="${apiKey}" data-workspace-id="${branding?.workspace_id}"></script>`, 'embed')}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white p-2 h-auto"
                      >
                         <Copy size={12} />
                      </Button>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Active Webhooks</h4>
                <div className="border border-white/5 rounded-2xl divide-y divide-white/5">
                   {webhooks.length === 0 ? (
                     <div className="p-12 text-center">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No outgoing data streams configured</p>
                     </div>
                   ) : (
                     webhooks.map(hook => (
                       <div key={hook.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                <Activity size={16} />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-white">{hook.url}</p>
                                <div className="flex gap-2 mt-1">
                                   {hook.events.map((e: string) => <Badge key={e} className="bg-white/5 text-[8px] font-bold text-white/40">{e}</Badge>)}
                                </div>
                             </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-white/20 hover:text-rose-500"><Trash2 size={14} /></Button>
                       </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Neural Integrity</h3>
                <p className="text-white/40 text-sm font-medium">Real-time audit of your neural workspace subsystems.</p>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Contacts', value: auditData?.leads || 0, icon: <Users className="text-primary" /> },
                  { label: 'Orders', value: auditData?.orders || 0, icon: <CreditCard className="text-primary" /> },
                  { label: 'Tasks', value: auditData?.tasks || 0, icon: <ShieldCheck className="text-primary" /> },
                  { label: 'Chats', value: auditData?.conversations || 0, icon: <Activity className="text-primary" /> },
                ].map((item: any, i: number) => (
                  <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">{item.icon}</div>
                       <Badge className="bg-success/10 text-success border-none text-[8px]">Live</Badge>
                    </div>
                    <div>
                      <span className="block text-2xl font-black text-white italic">{item.value}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">{item.label} Verified</span>
                    </div>
                  </div>
                ))}
             </div>

             <div className="p-8 bg-success/5 border border-success/20 rounded-3xl flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20 animate-pulse">
                   <Check size={32} />
                </div>
                <div>
                   <h4 className="text-lg font-black text-white uppercase italic tracking-tighter">Production Ready</h4>
                   <p className="text-xs text-white/40 font-medium italic">All neural data migrations have been verified. System integrity is at 100%.</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Neural Pricing</h3>
              <p className="text-white/40 text-sm font-medium">Manage your resource allocation and neural power levels.</p>
            </div>

            <div className="p-8 bg-gradient-to-br from-primary/20 to-transparent border border-primary/30 rounded-3xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[60px] -mr-32 -mt-32" />
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <Badge className="bg-primary text-white font-black uppercase tracking-widest text-[9px] px-3 py-1 mb-4 italic shadow-lg shadow-primary/30">Enterprise Pro Node</Badge>
                    <h4 className="text-3xl font-black text-white italic tracking-tighter mb-1 uppercase">Unlimited Neural Capacity</h4>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest italic">Lifetime Access • Priority Neural Support</p>
                  </div>
                  <Button className="bg-white text-primary hover:bg-white/90 font-black uppercase italic tracking-widest text-[11px] h-14 px-12 rounded-2xl shadow-2xl">
                    View Pricing Plans
                  </Button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Active Seats</span>
                  <p className="text-xl font-black text-white italic">{members.length} / ∞</p>
               </div>
               <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Automation Cycles</span>
                  <p className="text-xl font-black text-white italic">Unlimited</p>
               </div>
               <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Storage Node</span>
                  <p className="text-xl font-black text-white italic">500 GB</p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
