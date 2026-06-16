"use client";

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe, Shield, Rocket, Info, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Webhook, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { ColorPicker } from './ColorPicker';
import { createClient } from '@/lib/supabase/client';
import { useBuilder } from './BuilderContext';
import { 
  addCustomDomain, 
  removeCustomDomain, 
  verifyDomainSSL,
  createSubdirectoryPage,
  deleteSubdirectoryPage,
  renameSubdirectoryPage 
} from '@/app/actions/builderDeploy';

interface WebsiteSettingsProps {
  website: any;
  onUpdate: (updates: any) => void;
}

export const WebsiteSettings = ({ website, onUpdate }: WebsiteSettingsProps) => {
  const { pages: contextPages, websiteData } = useBuilder();
  const [localSettings, setLocalSettings] = useState({
    name: website?.name || '',
    subdomain: website?.subdomain || '',
    config: website?.config || { social_links: { facebook: '', instagram: '', twitter: '' } }
  });

  // Domains & Pages State
  const [domains, setDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  
  // Webhook State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (website) {
      setLocalSettings({
        name: website.name || '',
        subdomain: website.subdomain || '',
        config: website.config || { social_links: { facebook: '', instagram: '', twitter: '' } }
      });
      fetchDomains();
      fetchWebhooks();
    }
  }, [website]);

  const fetchDomains = async () => {
    if (!website?.id) return;
    const { data } = await supabase
      .from('builder_published_domains')
      .select('*')
      .eq('website_id', website.id);
    if (data) setDomains(data);
  };

  const fetchWebhooks = async () => {
    if (!website?.workspace_id) return;
    const { data } = await supabase
      .from('workspace_builder_settings')
      .select('settings')
      .eq('workspace_id', website.workspace_id)
      .maybeSingle();
    if (data?.settings?.webhooks) {
      setWebhooks(data.settings.webhooks);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain) return;
    setLoadingDomain(true);
    const res = await addCustomDomain(website.id, newDomain);
    setLoadingDomain(false);
    if (res.success) {
      toast.success('Domain registered');
      setNewDomain('');
      fetchDomains();
    } else {
      toast.error(res.error || 'Failed to add domain');
    }
  };

  const handleVerifySSL = async (domainId: string) => {
    const toastId = toast.loading('Querying Cloudflare domain verification proxy...');
    const res = await verifyDomainSSL(domainId);
    if (res.success) {
      toast.success('SSL credentials verified active!', { id: toastId });
      fetchDomains();
    } else {
      toast.error(res.error || 'Failed to verify DNS alignment', { id: toastId });
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm('Disconnect this domain configuration?')) return;
    const res = await removeCustomDomain(domainId);
    if (res.success) {
      toast.success('Domain disconnected');
      fetchDomains();
    } else {
      toast.error('Failed to disconnect domain');
    }
  };

  const handleAddPage = async () => {
    if (!newPageName || !newPagePath) return;
    const res = await createSubdirectoryPage(website.id, newPageName, newPagePath);
    if (res.success) {
      toast.success('Subdirectory page configured');
      setNewPageName('');
      setNewPagePath('');
      setTimeout(() => window.location.reload(), 300);
    } else {
      toast.error(res.error || 'Failed to create page');
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page subdirectory? This cannot be undone.')) return;
    const res = await deleteSubdirectoryPage(pageId);
    if (res.success) {
      toast.success('Page deleted successfully');
      setTimeout(() => window.location.reload(), 300);
    } else {
      toast.error('Failed to delete page');
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhookUrl) return;
    const updatedHooks = [...webhooks, { url: newWebhookUrl, active: true, events: ['form_submission'] }];
    
    // Save to workspace_builder_settings
    const { getWorkspaceBuilderSettings, updateWorkspaceBuilderSettings } = await import('@/app/actions/builder');
    const settingsRes = await getWorkspaceBuilderSettings();
    const currentSettings = settingsRes.success ? settingsRes.settings : {};
    
    const saveRes = await updateWorkspaceBuilderSettings({
      ...currentSettings,
      webhooks: updatedHooks
    });

    if (saveRes.success) {
      toast.success('Webhook registered');
      setNewWebhookUrl('');
      setWebhooks(updatedHooks);
    } else {
      toast.error('Failed to register webhook');
    }
  };

  const handleToggleWebhook = async (idx: number) => {
    const updated = webhooks.map((w, i) => i === idx ? { ...w, active: !w.active } : w);
    const { getWorkspaceBuilderSettings, updateWorkspaceBuilderSettings } = await import('@/app/actions/builder');
    const settingsRes = await getWorkspaceBuilderSettings();
    const currentSettings = settingsRes.success ? settingsRes.settings : {};
    
    const saveRes = await updateWorkspaceBuilderSettings({
      ...currentSettings,
      webhooks: updated
    });

    if (saveRes.success) {
      toast.success('Webhook updated');
      setWebhooks(updated);
    }
  };

  const handleRemoveWebhook = async (idx: number) => {
    const updated = webhooks.filter((_, i) => i !== idx);
    const { getWorkspaceBuilderSettings, updateWorkspaceBuilderSettings } = await import('@/app/actions/builder');
    const settingsRes = await getWorkspaceBuilderSettings();
    const currentSettings = settingsRes.success ? settingsRes.settings : {};
    
    await updateWorkspaceBuilderSettings({
      ...currentSettings,
      webhooks: updated
    });
    setWebhooks(updated);
    toast.success('Webhook deleted');
  };

  const handleChange = (field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (key: string, value: string) => {
    setLocalSettings(prev => {
      const updated = {
        ...prev,
        config: { ...(prev.config || {}), [key]: value }
      };
      onUpdate(updated);
      return updated;
    });
  };

  const handleSave = () => {
    onUpdate(localSettings);
    toast.success("Identity updates published live");
  };

  return (
    <div className="h-full flex flex-col pt-2 bg-transparent text-white select-none">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Site Settings</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 common-scrollbar">
        {/* Core Identity */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
            <Shield className="w-3 h-3" /> Brand Identity
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-white/70 font-bold tracking-tight">Website Name</Label>
              <Input 
                value={localSettings.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase text-white/70 font-bold tracking-tight">Subdomain</Label>
              <div className="relative flex-1">
                <Input 
                  value={localSettings.subdomain}
                  onChange={(e) => handleChange('subdomain', e.target.value)}
                  className="h-9 bg-white/5 border-white/10 text-white text-sm pr-20 placeholder:text-white/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-white/40 uppercase">.leadsmind</span>
              </div>
            </div>
          </div>
        </section>

        {/* Custom SSL Domains Manager */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
            <Rocket className="w-3 h-3" /> SSL Custom Domains
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="h-9 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20"
              />
              <Button onClick={handleAddDomain} disabled={loadingDomain} size="sm" className="bg-primary text-white h-9 px-3 text-[10px] uppercase font-bold">
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {domains.map((dom) => (
                <div key={dom.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {dom.domain_name}
                      {dom.verified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                    <div className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">
                      CNAME Target: proxy.leadsmind.com | Status: {dom.ssl_status}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleVerifySSL(dom.id)} size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white bg-white/5 hover:bg-white/10">
                      <RefreshCw size={12} />
                    </Button>
                    <Button onClick={() => handleRemoveDomain(dom.id)} size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-red-500 bg-white/5 hover:bg-red-500/10">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subdirectories Pages Setup */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
            <Globe className="w-3 h-3" /> Page Subdirectories
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input 
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="About Us"
                className="h-9 bg-white/5 border-white/10 text-white text-xs"
              />
              <Input 
                value={newPagePath}
                onChange={(e) => setNewPagePath(e.target.value)}
                placeholder="about"
                className="h-9 bg-white/5 border-white/10 text-white text-xs"
              />
            </div>
            <Button onClick={handleAddPage} className="w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 h-9 text-[10px] uppercase font-bold">
              Add New Page Path
            </Button>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {contextPages.map((p) => (
                <div key={p.id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">{p.name}</div>
                    <div className="text-[9px] text-primary font-bold">/{p.slug}</div>
                  </div>
                  {p.slug !== 'home' && p.slug !== '' && (
                    <Button onClick={() => handleDeletePage(p.id)} size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-red-500 bg-white/5 hover:bg-red-500/10">
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Webhooks Integrations */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
            <Webhook className="w-3 h-3" /> Lead Capture Webhooks
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="h-9 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20"
              />
              <Button onClick={handleAddWebhook} size="sm" className="bg-primary text-white h-9 px-3 text-[10px] uppercase font-bold">
                Connect
              </Button>
            </div>

            <div className="space-y-2">
              {webhooks.map((hook, idx) => (
                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="truncate pr-4 flex-1">
                    <div className="text-xs font-bold text-white truncate">{hook.url}</div>
                    <div className="text-[9px] font-bold text-emerald-500 uppercase">
                      {hook.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button onClick={() => handleToggleWebhook(idx)} size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-white bg-white/5 hover:bg-white/10">
                      <RefreshCw size={12} />
                    </Button>
                    <Button onClick={() => handleRemoveWebhook(idx)} size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:text-red-500 bg-white/5 hover:bg-red-500/10">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Design Tokens Panel */}
        <section className="space-y-4 pt-4 border-t border-white/5">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
            <Globe className="w-3 h-3 text-[#fbbf24]" /> Colors & Palettes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker label="Primary" value={localSettings.config?.primaryColor || '#6c47ff'} onChange={(val) => handleConfigChange('primaryColor', val)} />
            <ColorPicker label="Secondary" value={localSettings.config?.secondaryColor || '#3b82f6'} onChange={(val) => handleConfigChange('secondaryColor', val)} />
            <ColorPicker label="Accent" value={localSettings.config?.accentColor || '#fbbf24'} onChange={(val) => handleConfigChange('accentColor', val)} />
            <ColorPicker label="Canvas BG" value={localSettings.config?.backgroundColor || '#050508'} onChange={(val) => handleConfigChange('backgroundColor', val)} />
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary-dark text-white font-bold h-10 shadow-lg shadow-primary/20 uppercase text-[10px] tracking-widest">
          Push Global Updates
        </Button>
      </div>
    </div>
  );
};
